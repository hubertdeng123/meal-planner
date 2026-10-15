import { vi } from 'vitest';
import type { RecipeStreamEvent } from '../../types';

const encoder = new TextEncoder();

export function frame(event: RecipeStreamEvent['event'], data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

/** A streaming body whose chunks the test pushes by hand. */
export function controllableBody() {
  let controller!: ReadableStreamDefaultController<Uint8Array>;
  const body = new ReadableStream<Uint8Array>({
    start(c) {
      controller = c;
    },
  });
  return {
    body,
    push: (chunk: string) => controller.enqueue(encoder.encode(chunk)),
    close: () => controller.close(),
    fail: (error: unknown) => controller.error(error),
  };
}

export function sseResponse(chunks: string[]): Response {
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      chunks.forEach(chunk => controller.enqueue(encoder.encode(chunk)));
      controller.close();
    },
  });
  return new Response(body, { status: 200, headers: { 'Content-Type': 'text/event-stream' } });
}

export function abortError(): DOMException {
  return new DOMException('The operation was aborted.', 'AbortError');
}

/**
 * Mock `fetch` with a function that receives the request and returns the response; the
 * returned promise (and any body) rejects with AbortError when the request signal aborts.
 */
export function mockFetch(respond: (init: RequestInit) => Response | Promise<Response>) {
  const fetchMock = vi.mocked(globalThis.fetch);
  fetchMock.mockImplementation((_input: RequestInfo | URL, init: RequestInit = {}) => {
    const signal = init.signal;
    return new Promise<Response>((resolve, reject) => {
      if (signal?.aborted) {
        reject(abortError());
        return;
      }
      signal?.addEventListener('abort', () => reject(abortError()));
      Promise.resolve(respond(init)).then(response => {
        if (!response.body || !signal) {
          resolve(response);
          return;
        }
        const reader = response.body.getReader();
        const guarded = new ReadableStream<Uint8Array>({
          start(controller) {
            signal.addEventListener('abort', () => {
              controller.error(abortError());
              reader.cancel().catch(() => undefined);
            });
          },
          async pull(controller) {
            try {
              const { done, value } = await reader.read();
              if (done) {
                controller.close();
              } else {
                controller.enqueue(value);
              }
            } catch (error) {
              controller.error(error);
            }
          },
        });
        resolve(new Response(guarded, { status: response.status, headers: response.headers }));
      }, reject);
    });
  });
  return fetchMock;
}

export const completeRecipe = {
  id: 42,
  user_id: 1,
  name: 'Thai Basil Tofu',
  description: 'Fast and fragrant',
  instructions: ['Cook rice', 'Stir-fry'],
  ingredients: [{ name: 'firm tofu', quantity: 300, unit: 'g', notes: null }],
  prep_time_minutes: 10,
  cook_time_minutes: 15,
  total_minutes: 25,
  servings: 2,
  tags: ['vegetarian'],
  cuisine: 'Thai',
  difficulty: 'easy',
  nutrition: { calories: 450 },
  source: 'ai_generated',
  source_urls: [],
  created_at: '2026-10-14T04:00:00',
  feedback: null,
};
