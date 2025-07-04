import { describe, it, expect, vi, beforeEach } from 'vitest';
import recipeService from '../recipe.service';
import { api } from '../api';
import { mockRecipe } from '../../test/utils';

// Mock the API module
vi.mock('../api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

// Mock auth service to provide token
vi.mock('../auth.service', () => ({
  default: {
    getToken: vi.fn(() => 'mock-token'),
    isAuthenticated: vi.fn(() => true),
  },
}));

const mockApi = vi.mocked(api);

describe('RecipeService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getRecipes', () => {
    it('should fetch recipes from API', async () => {
      const recipes = [mockRecipe];
      mockApi.get.mockResolvedValue({ data: recipes });

      const result = await recipeService.getRecipes();

      expect(mockApi.get).toHaveBeenCalledWith('/recipes/');
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

  describe('generateRecipeStream', () => {
    it('should handle recipe generation with callbacks', async () => {
      const requestData = {
        ingredients_to_use: ['tomatoes'],
        ingredients_to_avoid: [],
        dietary_restrictions: [],
        servings: 4,
      };

      const callbacks = {
        onThinking: vi.fn(),
        onThinkingContent: vi.fn(),
        onPlanning: vi.fn(),
        onPlanningContent: vi.fn(),
        onRecipeStart: vi.fn(),
        onRecipeContent: vi.fn(),
        onRecipeComplete: vi.fn(),
        onComplete: vi.fn(),
        onError: vi.fn(),
      };

      // Mock successful response
      const mockResponse = {
        body: {
          getReader: vi.fn().mockReturnValue({
            read: vi
              .fn()
              .mockResolvedValueOnce({
                done: false,
                value: new TextEncoder().encode(
                  'data: {"type": "thinking", "content": "Analyzing ingredients..."}\n\n'
                ),
              })
              .mockResolvedValueOnce({
                done: false,
                value: new TextEncoder().encode(
                  'data: {"type": "recipe_complete", "recipe": ' +
                    JSON.stringify(mockRecipe) +
                    '}\n\n'
                ),
              })
              .mockResolvedValueOnce({
                done: true,
              }),
          }),
        },
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      await recipeService.generateRecipeStream(requestData, callbacks);

      expect(fetch).toHaveBeenCalledWith(
        '/api/recipes/generate-stream',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify(requestData),
        })
      );

      expect(callbacks.onThinking).toHaveBeenCalled();
      expect(callbacks.onRecipeComplete).toHaveBeenCalledWith(mockRecipe);
    });

    it('should handle stream errors', async () => {
      const requestData = {
        ingredients_to_use: ['tomatoes'],
        ingredients_to_avoid: [],
        dietary_restrictions: [],
        servings: 4,
      };

      const callbacks = {
        onThinking: vi.fn(),
        onThinkingContent: vi.fn(),
        onPlanning: vi.fn(),
        onPlanningContent: vi.fn(),
        onRecipeStart: vi.fn(),
        onRecipeContent: vi.fn(),
        onRecipeComplete: vi.fn(),
        onComplete: vi.fn(),
        onError: vi.fn(),
      };

      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      await expect(recipeService.generateRecipeStream(requestData, callbacks)).rejects.toThrow(
        'Network error'
      );
    });

    it('should handle malformed stream data', async () => {
      const requestData = {
        ingredients_to_use: ['tomatoes'],
        ingredients_to_avoid: [],
        dietary_restrictions: [],
        servings: 4,
      };

      const callbacks = {
        onThinking: vi.fn(),
        onThinkingContent: vi.fn(),
        onPlanning: vi.fn(),
        onPlanningContent: vi.fn(),
        onRecipeStart: vi.fn(),
        onRecipeContent: vi.fn(),
        onRecipeComplete: vi.fn(),
        onComplete: vi.fn(),
        onError: vi.fn(),
      };

      // Mock response with invalid JSON
      const mockResponse = {
        body: {
          getReader: vi.fn().mockReturnValue({
            read: vi
              .fn()
              .mockResolvedValueOnce({
                done: false,
                value: new TextEncoder().encode('data: invalid json\n\n'),
              })
              .mockResolvedValueOnce({
                done: true,
              }),
          }),
        },
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      await recipeService.generateRecipeStream(requestData, callbacks);

      // Should not crash on invalid JSON, just ignore the malformed line
      expect(callbacks.onError).not.toHaveBeenCalled();
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
