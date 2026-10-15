import { useCallback, useEffect, useRef, useState } from 'react';
import recipeService, { RecipeStreamError, isAbortError } from '../services/recipe.service';
import type {
  RecipeDraft,
  RecipeGenerationRequest,
  RecipeStreamEvent,
  RecipeStreamState,
  StreamError,
} from '../types';

export const RECIPE_STREAM_TIMEOUT_MS = 90_000;
const ELAPSED_TICK_MS = 250;

const TIMEOUT_ERROR: StreamError = {
  message: 'This is taking longer than expected. Please try again.',
  retryable: true,
};

const INITIAL_STATE: RecipeStreamState = {
  stage: 'idle',
  thinking: '',
  draft: null,
  recipe: null,
  error: null,
  elapsedMs: 0,
};

type FrameHandle =
  | { kind: 'raf'; id: number }
  | { kind: 'timeout'; id: ReturnType<typeof setTimeout> };

function requestFrame(callback: () => void): FrameHandle {
  if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
    return { kind: 'raf', id: window.requestAnimationFrame(callback) };
  }
  return { kind: 'timeout', id: setTimeout(callback, 16) };
}

function cancelFrame(handle: FrameHandle) {
  if (handle.kind === 'raf') {
    window.cancelAnimationFrame(handle.id);
  } else {
    clearTimeout(handle.id);
  }
}

interface ActiveRun {
  id: number;
  controller: AbortController;
  startedAt: number;
  timeoutId: ReturnType<typeof setTimeout>;
  tickId: ReturnType<typeof setInterval>;
}

export interface UseRecipeStreamResult extends RecipeStreamState {
  start: (request: RecipeGenerationRequest) => void;
  cancel: () => void;
  reset: () => void;
}

/**
 * Drive one streamed recipe generation (contract v2) and expose its progress as React state.
 *
 * Thinking deltas and draft snapshots are buffered and flushed at most once per animation
 * frame. `cancel()` aborts and returns to `idle` while keeping the partial thinking/draft;
 * `reset()` clears everything. Unmounting aborts any in-flight request.
 */
export function useRecipeStream(): UseRecipeStreamResult {
  const [state, setState] = useState<RecipeStreamState>(INITIAL_STATE);

  const runRef = useRef<ActiveRun | null>(null);
  const runCounter = useRef(0);
  const pendingThinking = useRef('');
  const pendingDraft = useRef<RecipeDraft | null>(null);
  const frameRef = useRef<FrameHandle | null>(null);

  const flush = useCallback(() => {
    if (frameRef.current) {
      cancelFrame(frameRef.current);
      frameRef.current = null;
    }
    const thinkingDelta = pendingThinking.current;
    const draft = pendingDraft.current;
    if (!thinkingDelta && !draft) {
      return;
    }
    pendingThinking.current = '';
    pendingDraft.current = null;
    setState(prev => ({
      ...prev,
      thinking: thinkingDelta ? prev.thinking + thinkingDelta : prev.thinking,
      draft: draft ?? prev.draft,
    }));
  }, []);

  const scheduleFlush = useCallback(() => {
    if (!frameRef.current) {
      frameRef.current = requestFrame(() => {
        frameRef.current = null;
        flush();
      });
    }
  }, [flush]);

  const discardPending = useCallback(() => {
    if (frameRef.current) {
      cancelFrame(frameRef.current);
      frameRef.current = null;
    }
    pendingThinking.current = '';
    pendingDraft.current = null;
  }, []);

  /** Stop timers and abort the network request for the active run, if any. */
  const stopRun = useCallback((): ActiveRun | null => {
    const run = runRef.current;
    if (!run) {
      return null;
    }
    runRef.current = null;
    clearTimeout(run.timeoutId);
    clearInterval(run.tickId);
    run.controller.abort();
    return run;
  }, []);

  const finish = useCallback(
    (runId: number, patch: Partial<RecipeStreamState>) => {
      const run = runRef.current;
      if (!run || run.id !== runId) {
        return;
      }
      flush();
      const elapsedMs = Date.now() - run.startedAt;
      stopRun();
      setState(prev => ({ ...prev, ...patch, elapsedMs }));
    },
    [flush, stopRun]
  );

  const handleEvent = useCallback(
    (runId: number, event: RecipeStreamEvent) => {
      if (runRef.current?.id !== runId) {
        return;
      }
      switch (event.event) {
        case 'stage':
          flush();
          setState(prev => ({ ...prev, stage: event.data.stage }));
          break;
        case 'thinking':
          pendingThinking.current += event.data.delta;
          scheduleFlush();
          break;
        case 'draft':
          pendingDraft.current = event.data.recipe;
          scheduleFlush();
          break;
        case 'complete':
          finish(runId, { stage: 'complete', recipe: event.data.recipe, error: null });
          break;
        case 'error':
          finish(runId, {
            stage: 'error',
            error: { message: event.data.message, retryable: event.data.retryable },
          });
          break;
        default:
          break;
      }
    },
    [finish, flush, scheduleFlush]
  );

  const start = useCallback(
    (request: RecipeGenerationRequest) => {
      stopRun();
      discardPending();

      const id = ++runCounter.current;
      const controller = new AbortController();
      const startedAt = Date.now();
      const run: ActiveRun = {
        id,
        controller,
        startedAt,
        timeoutId: setTimeout(
          () => finish(id, { stage: 'error', error: TIMEOUT_ERROR }),
          RECIPE_STREAM_TIMEOUT_MS
        ),
        tickId: setInterval(() => {
          if (runRef.current?.id === id) {
            setState(prev => ({ ...prev, elapsedMs: Date.now() - startedAt }));
          }
        }, ELAPSED_TICK_MS),
      };
      runRef.current = run;
      setState({ ...INITIAL_STATE, stage: 'context' });

      recipeService
        .streamRecipe(request, {
          signal: controller.signal,
          onEvent: event => handleEvent(id, event),
        })
        .catch((error: unknown) => {
          if (isAbortError(error) || controller.signal.aborted) {
            return;
          }
          const streamError: StreamError =
            error instanceof RecipeStreamError
              ? { message: error.message, retryable: error.retryable }
              : {
                  message: 'Something went wrong while generating. Please try again.',
                  retryable: true,
                };
          finish(id, { stage: 'error', error: streamError });
        });
    },
    [discardPending, finish, handleEvent, stopRun]
  );

  const cancel = useCallback(() => {
    const run = runRef.current;
    if (!run) {
      return;
    }
    flush();
    stopRun();
    setState(prev => ({ ...prev, stage: 'idle', elapsedMs: Date.now() - run.startedAt }));
  }, [flush, stopRun]);

  const reset = useCallback(() => {
    stopRun();
    discardPending();
    setState(INITIAL_STATE);
  }, [discardPending, stopRun]);

  useEffect(
    () => () => {
      stopRun();
      discardPending();
    },
    [discardPending, stopRun]
  );

  return { ...state, start, cancel, reset };
}

export default useRecipeStream;
