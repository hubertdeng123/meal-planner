import { describe, it, expect, vi, beforeEach } from 'vitest';
import recipeService, { RecipeStreamError } from '../recipe.service';
import { api } from '../api';
import { mockRecipe } from '../../test/utils';
import type { RecipeStreamEvent } from '../../types';
import { completeRecipe, frame, mockFetch, sseResponse } from './streamFixtures';

// Mock the API module
vi.mock('../api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    defaults: {
      baseURL: 'http://localhost:8000/api/v1',
    },
  },
}));

const mockApi = vi.mocked(api);

describe('RecipeService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem('access_token', 'mock-test-token');
  });

  describe('getRecipes', () => {
    it('should fetch recipes from API', async () => {
      const recipes = [mockRecipe];
      mockApi.get.mockResolvedValue({ data: recipes });

      const result = await recipeService.getRecipes();

      expect(mockApi.get).toHaveBeenCalledWith('/recipes/', { params: { skip: 0, limit: 20 } });
      expect(result).toEqual(recipes);
    });

    it('should handle API errors', async () => {
      const error = new Error('Network error');
      mockApi.get.mockRejectedValue(error);

      await expect(recipeService.getRecipes()).rejects.toThrow(error);
    });
  });

  describe('getRecipe', () => {
    it('should fetch single recipe by ID', async () => {
      mockApi.get.mockResolvedValue({ data: mockRecipe });

      const result = await recipeService.getRecipe(1);

      expect(mockApi.get).toHaveBeenCalledWith('/recipes/1');
      expect(result).toEqual(mockRecipe);
    });

    it('should handle recipe not found', async () => {
      const error = new Error('Recipe not found');
      mockApi.get.mockRejectedValue(error);

      await expect(recipeService.getRecipe(999)).rejects.toThrow(error);
    });
  });

  describe('getRecipesPaginated', () => {
    it('maps params to the list query, dropping empty filters', async () => {
      mockApi.get.mockResolvedValue({ data: { items: [], page: 1, page_size: 12, total: 0 } });

      await recipeService.getRecipesPaginated({
        pageSize: 24,
        q: '',
        cuisine: 'Thai',
        favorites: true,
        sort: 'total_minutes',
        order: 'asc',
      });

      expect(mockApi.get).toHaveBeenCalledWith('/recipes/list', {
        params: {
          page: 1,
          page_size: 24,
          q: undefined,
          tags: undefined,
          cuisine: 'Thai',
          favorites: true,
          sort: 'total_minutes',
          order: 'asc',
        },
      });
    });
  });

  describe('feedback and facets', () => {
    it('reads feedback and normalizes an empty body to null', async () => {
      mockApi.get.mockResolvedValueOnce({ data: { id: 1, rating: 4 } });
      mockApi.get.mockResolvedValueOnce({ data: null });

      expect(await recipeService.getFeedback(3)).toEqual({ id: 1, rating: 4 });
      expect(await recipeService.getFeedback(3)).toBeNull();
      expect(mockApi.get).toHaveBeenCalledWith('/recipes/3/feedback');
    });

    it('deletes feedback', async () => {
      mockApi.delete.mockResolvedValue({ data: null });

      await recipeService.deleteFeedback(3);

      expect(mockApi.delete).toHaveBeenCalledWith('/recipes/3/feedback');
    });

    it('fetches facets', async () => {
      const facets = { cuisines: [{ value: 'Thai', count: 2 }], tags: [], total: 2 };
      mockApi.get.mockResolvedValue({ data: facets });

      expect(await recipeService.getFacets()).toEqual(facets);
      expect(mockApi.get).toHaveBeenCalledWith('/recipes/facets');
    });
  });

  describe('deleteRecipe', () => {
    it('should delete recipe by ID', async () => {
      mockApi.delete.mockResolvedValue({ data: {} });

      await recipeService.deleteRecipe(1);

      expect(mockApi.delete).toHaveBeenCalledWith('/recipes/1');
    });

    it('should handle deletion errors', async () => {
      const error = new Error('Delete failed');
      mockApi.delete.mockRejectedValue(error);

      await expect(recipeService.deleteRecipe(1)).rejects.toThrow(error);
    });
  });

  describe('streamRecipe', () => {
    const request = {
      ingredients_to_use: [],
      ingredients_to_avoid: [],
      dietary_restrictions: [],
      servings: 2,
    };

    async function collect(): Promise<RecipeStreamEvent[]> {
      const events: RecipeStreamEvent[] = [];
      await recipeService.streamRecipe(request, { onEvent: event => events.push(event) });
      return events;
    }

    it('posts the request with auth and emits parsed v2 events', async () => {
      const fetchMock = mockFetch(() =>
        sseResponse([
          frame('stage', { stage: 'context', message: 'Reading' }),
          'event: thinking\ndata: {"delta":"Hm',
          'm"}\n\n',
          frame('ping', {}),
          'event: unknown\ndata: {}\n\nevent: draft\ndata: not-json\n\n',
          frame('draft', { recipe: { name: 'Thai' } }),
          frame('complete', { recipe: completeRecipe }),
        ])
      );

      const events = await collect();

      expect(events).toEqual([
        { event: 'stage', data: { stage: 'context', message: 'Reading' } },
        { event: 'thinking', data: { delta: 'Hmm' } },
        { event: 'ping', data: {} },
        { event: 'draft', data: { recipe: { name: 'Thai' } } },
        { event: 'complete', data: { recipe: completeRecipe } },
      ]);
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe('http://localhost:8000/api/v1/recipes/generate/stream');
      expect(init?.method).toBe('POST');
      expect(init?.headers).toMatchObject({ Authorization: 'Bearer mock-test-token' });
      expect(JSON.parse(init?.body as string)).toEqual(request);
    });

    it('stops reading after a terminal error event', async () => {
      mockFetch(() =>
        sseResponse([
          frame('error', { message: 'Busy', retryable: true }),
          frame('complete', { recipe: completeRecipe }),
        ])
      );

      expect(await collect()).toEqual([
        { event: 'error', data: { message: 'Busy', retryable: true } },
      ]);
    });

    it('rejects with a retryable error when the stream ends early', async () => {
      mockFetch(() => sseResponse([frame('stage', { stage: 'context', message: '' })]));

      await expect(collect()).rejects.toMatchObject({
        name: 'RecipeStreamError',
        retryable: true,
      });
    });

    it.each([
      [
        503,
        { detail: 'Recipe generation is unavailable' },
        'Recipe generation is unavailable',
        false,
      ],
      [
        401,
        { detail: 'Could not validate credentials' },
        'Your session has expired. Please log in again.',
        false,
      ],
      [429, {}, 'Too many requests. Wait a moment and try again.', true],
      [500, 'oops', 'Recipe generation failed (HTTP 500).', true],
    ])('maps HTTP %s to a friendly error', async (status, body, message, retryable) => {
      mockFetch(
        () =>
          new Response(typeof body === 'string' ? body : JSON.stringify(body), {
            status,
            headers: { 'Content-Type': 'application/json' },
          })
      );

      const error = await collect().catch(e => e);

      expect(error).toBeInstanceOf(RecipeStreamError);
      expect(error).toMatchObject({ message, retryable, status });
    });

    it('fails fast without a token', async () => {
      localStorage.removeItem('access_token');

      await expect(collect()).rejects.toMatchObject({ retryable: false, status: 401 });
      expect(globalThis.fetch).not.toHaveBeenCalled();
    });

    it('propagates AbortError when the signal aborts', async () => {
      mockFetch(() => new Promise<Response>(() => undefined));
      const controller = new AbortController();

      const pending = recipeService.streamRecipe(request, {
        signal: controller.signal,
        onEvent: () => undefined,
      });
      controller.abort();

      await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
    });

    it('maps network failures to a retryable error', async () => {
      vi.mocked(globalThis.fetch).mockRejectedValue(new TypeError('Failed to fetch'));

      await expect(collect()).rejects.toMatchObject({
        retryable: true,
        message: 'Could not reach the server. Check your connection.',
      });
    });
  });

  describe('error handling', () => {
    it('should pass through API response errors', async () => {
      const apiError = {
        response: {
          status: 400,
          data: {
            detail: 'Invalid request data',
          },
        },
      };

      mockApi.get.mockRejectedValue(apiError);

      await expect(recipeService.getRecipes()).rejects.toEqual(apiError);
    });

    it('should handle network errors', async () => {
      const networkError = new Error('Network connection failed');
      mockApi.get.mockRejectedValue(networkError);

      await expect(recipeService.getRecipes()).rejects.toThrow('Network connection failed');
    });
  });
});
