import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RECIPE_STREAM_TIMEOUT_MS, useRecipeStream } from '../useRecipeStream';
import {
  completeRecipe,
  controllableBody,
  frame,
  mockFetch,
  sseResponse,
} from '../../services/__tests__/streamFixtures';
import type { RecipeGenerationRequest } from '../../types';

vi.mock('../../services/api', () => ({
  api: { defaults: { baseURL: 'http://localhost:8000/api/v1' } },
}));

const request: RecipeGenerationRequest = {
  meal_type: 'dinner',
  ingredients_to_use: ['tofu'],
  ingredients_to_avoid: [],
  dietary_restrictions: [],
  servings: 2,
};

function lastSignal(): AbortSignal {
  const calls = vi.mocked(globalThis.fetch).mock.calls;
  return calls[calls.length - 1][1]!.signal as AbortSignal;
}

describe('useRecipeStream', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem('access_token', 'token-123');
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts idle', () => {
    const { result } = renderHook(() => useRecipeStream());

    expect(result.current).toMatchObject({
      stage: 'idle',
      thinking: '',
      draft: null,
      recipe: null,
      error: null,
      elapsedMs: 0,
    });
  });

  it('walks through the stages and ends with the saved recipe', async () => {
    const stream = controllableBody();
    mockFetch(() => new Response(stream.body, { status: 200 }));
    const { result } = renderHook(() => useRecipeStream());

    act(() => result.current.start(request));
    expect(result.current.stage).toBe('context');

    act(() => {
      stream.push(frame('stage', { stage: 'context', message: 'Reading' }));
      stream.push(frame('stage', { stage: 'thinking', message: 'Thinking' }));
      stream.push(frame('thinking', { delta: 'Tofu and ' }));
      stream.push(frame('thinking', { delta: 'basil.' }));
    });
    await waitFor(() => expect(result.current.thinking).toBe('Tofu and basil.'));
    expect(result.current.stage).toBe('thinking');

    act(() => {
      stream.push(frame('stage', { stage: 'drafting', message: 'Writing' }));
      stream.push(frame('draft', { recipe: { name: 'Thai' } }));
      stream.push(frame('draft', { recipe: { name: 'Thai Basil Tofu', ingredients: [{}] } }));
    });
    await waitFor(() =>
      expect(result.current.draft).toEqual({ name: 'Thai Basil Tofu', ingredients: [{}] })
    );
    expect(result.current.stage).toBe('drafting');

    act(() => {
      stream.push(frame('stage', { stage: 'saving', message: 'Saving' }));
      stream.push(frame('complete', { recipe: completeRecipe }));
    });
    await waitFor(() => expect(result.current.stage).toBe('complete'));
    expect(result.current.recipe).toEqual(completeRecipe);
    expect(result.current.error).toBeNull();
    expect(result.current.thinking).toBe('Tofu and basil.');

    const init = vi.mocked(globalThis.fetch).mock.calls[0][1]!;
    expect(init.headers).toMatchObject({ Authorization: 'Bearer token-123' });
    expect(JSON.parse(init.body as string)).toEqual(request);
  });

  it('coalesces bursts of thinking and draft events into few renders', async () => {
    const deltas = Array.from({ length: 200 }, (_, i) => frame('thinking', { delta: `${i} ` }));
    const drafts = Array.from({ length: 50 }, (_, i) =>
      frame('draft', { recipe: { name: `Draft ${i}` } })
    );
    const stream = controllableBody();
    mockFetch(() => new Response(stream.body, { status: 200 }));
    let renders = 0;
    const { result } = renderHook(() => {
      renders++;
      return useRecipeStream();
    });

    act(() => result.current.start(request));
    const before = renders;
    act(() => stream.push([...deltas, ...drafts].join('')));
    await waitFor(() => expect(result.current.draft).toEqual({ name: 'Draft 49' }));

    expect(result.current.thinking).toBe(Array.from({ length: 200 }, (_, i) => `${i} `).join(''));
    expect(renders - before).toBeLessThan(10);
  });

  it('surfaces a server error event', async () => {
    mockFetch(() =>
      sseResponse([
        frame('stage', { stage: 'context', message: '' }),
        frame('error', { message: 'The AI chef is busy.', retryable: true }),
      ])
    );
    const { result } = renderHook(() => useRecipeStream());

    act(() => result.current.start(request));

    await waitFor(() => expect(result.current.stage).toBe('error'));
    expect(result.current.error).toEqual({ message: 'The AI chef is busy.', retryable: true });
  });

  it('surfaces HTTP failures as non-retryable when appropriate', async () => {
    mockFetch(() => new Response(JSON.stringify({ detail: 'Not available' }), { status: 503 }));
    const { result } = renderHook(() => useRecipeStream());

    act(() => result.current.start(request));

    await waitFor(() => expect(result.current.stage).toBe('error'));
    expect(result.current.error).toEqual({ message: 'Not available', retryable: false });
  });

  it('treats a dropped connection as retryable', async () => {
    mockFetch(() => sseResponse([frame('stage', { stage: 'context', message: '' })]));
    const { result } = renderHook(() => useRecipeStream());

    act(() => result.current.start(request));

    await waitFor(() => expect(result.current.stage).toBe('error'));
    expect(result.current.error?.retryable).toBe(true);
  });

  it('cancel aborts the request, returns to idle and keeps partial output', async () => {
    const stream = controllableBody();
    mockFetch(() => new Response(stream.body, { status: 200 }));
    const { result } = renderHook(() => useRecipeStream());

    act(() => result.current.start(request));
    act(() => stream.push(frame('draft', { recipe: { name: 'Half' } })));
    await waitFor(() => expect(result.current.draft).toEqual({ name: 'Half' }));

    act(() => result.current.cancel());

    expect(lastSignal().aborted).toBe(true);
    expect(result.current.stage).toBe('idle');
    expect(result.current.error).toBeNull();
    expect(result.current.draft).toEqual({ name: 'Half' });

    act(() => result.current.reset());
    expect(result.current.draft).toBeNull();
  });

  it('ignores events from a superseded run', async () => {
    const first = controllableBody();
    const second = controllableBody();
    const bodies = [first.body, second.body];
    mockFetch(() => new Response(bodies.shift()!, { status: 200 }));
    const { result } = renderHook(() => useRecipeStream());

    act(() => result.current.start(request));
    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalledTimes(1));
    act(() => result.current.start(request));
    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalledTimes(2));

    act(() => second.push(frame('complete', { recipe: completeRecipe })));
    await waitFor(() => expect(result.current.stage).toBe('complete'));
    expect(vi.mocked(globalThis.fetch).mock.calls[0][1]!.signal!.aborted).toBe(true);
  });

  it('aborts on unmount', async () => {
    mockFetch(() => new Promise<Response>(() => undefined));
    const { result, unmount } = renderHook(() => useRecipeStream());

    act(() => result.current.start(request));
    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalled());
    unmount();

    expect(lastSignal().aborted).toBe(true);
  });

  it('times out after 90 seconds with a retryable error', async () => {
    vi.useFakeTimers();
    mockFetch(() => new Promise<Response>(() => undefined));
    const { result } = renderHook(() => useRecipeStream());

    act(() => result.current.start(request));
    act(() => vi.advanceTimersByTime(1_000));
    expect(result.current.elapsedMs).toBeGreaterThanOrEqual(1_000);
    expect(result.current.stage).toBe('context');

    act(() => vi.advanceTimersByTime(RECIPE_STREAM_TIMEOUT_MS));

    expect(result.current.stage).toBe('error');
    expect(result.current.error?.retryable).toBe(true);
    expect(lastSignal().aborted).toBe(true);
    const frozen = result.current.elapsedMs;
    act(() => vi.advanceTimersByTime(5_000));
    expect(result.current.elapsedMs).toBe(frozen);
  });
});
