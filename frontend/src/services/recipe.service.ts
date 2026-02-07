import { api } from './api';
import type {
  Ingredient,
  NutritionFacts,
  PaginatedResponse,
  Recipe,
  RecipeFeedback,
  RecipeFeedbackResponse,
  RecipeGenerationRequest,
} from '../types';

export interface StreamRecipeMetadata {
  prep_time: number;
  cook_time: number;
  servings: number;
}

export interface StreamMessage {
  type:
    | 'status'
    | 'thinking_start'
    | 'thinking'
    | 'thinking_end'
    | 'tool_started'
    | 'tool_completed'
    | 'recipe_start'
    | 'recipe_name'
    | 'recipe_description'
    | 'recipe_metadata'
    | 'ingredients_start'
    | 'ingredient'
    | 'instructions_start'
    | 'instruction'
    | 'nutrition'
    | 'complete'
    | 'error';
  message?: string;
  chunk?: string;
  content?: string | StreamRecipeMetadata | Ingredient | NutritionFacts;
  step?: number;
  recipe_id?: number;
  thinking_length?: number;
  // Tool event fields
  tool_name?: string;
  icon?: string;
  title?: string;
  description?: string;
}

export interface StreamCallbacks {
  onStatus?: (message: string) => void;
  onThinkingStart?: () => void;
  onThinking?: (content: string) => void;
  onThinkingEnd?: () => void;
  onToolStarted?: (toolName: string, icon: string, title: string, description: string) => void;
  onToolCompleted?: (toolName: string) => void;
  onRecipeStart?: () => void;
  onRecipeName?: (name: string) => void;
  onRecipeDescription?: (description: string) => void;
  onRecipeMetadata?: (metadata: StreamRecipeMetadata) => void;
  onIngredientsStart?: () => void;
  onIngredient?: (ingredient: Ingredient) => void;
  onInstructionsStart?: () => void;
  onInstruction?: (step: number, content: string) => void;
  onNutrition?: (nutrition: NutritionFacts) => void;
  onComplete?: (recipeId: number, message?: string, thinkingLength?: number) => void;
  onError?: (error: string) => void;
}

export interface GenerateRecipeStreamOptions {
  signal?: AbortSignal;
}

export interface RecipeListParams {
  page?: number;
  pageSize?: number;
  q?: string;
  tags?: string[];
  sort?: 'created_at' | 'name';
  order?: 'asc' | 'desc';
}

class RecipeService {
  async generateRecipeStream(
    request: RecipeGenerationRequest,
    callbacks: StreamCallbacks,
    options: GenerateRecipeStreamOptions = {}
  ): Promise<void> {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        throw new Error('No authentication token found. Please log in.');
      }

      const response = await fetch(`${api.defaults.baseURL}/recipes/generate/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(request),
        signal: options.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Response body is not readable');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');

        // Keep the last incomplete line in the buffer
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data: StreamMessage = JSON.parse(line.substring(6));
              this.handleStreamMessage(data, callbacks);
            } catch (e) {
              console.error('Failed to parse streaming payload', e);
            }
          }
        }
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        callbacks.onError?.('Request cancelled');
        return;
      }
      console.error('Recipe stream failed', error);
      callbacks.onError?.(error instanceof Error ? error.message : 'Unknown streaming error');
    }
  }

  private handleStreamMessage(data: StreamMessage, callbacks: StreamCallbacks) {
    switch (data.type) {
      case 'status':
        callbacks.onStatus?.(data.message || '');
        break;
      case 'thinking_start':
        callbacks.onThinkingStart?.();
        break;
      case 'thinking':
        callbacks.onThinking?.(typeof data.content === 'string' ? data.content : '');
        break;
      case 'thinking_end':
        callbacks.onThinkingEnd?.();
        break;
      case 'tool_started':
        callbacks.onToolStarted?.(
          data.tool_name || '',
          data.icon || '🔧',
          data.title || '',
          data.description || ''
        );
        break;
      case 'tool_completed':
        callbacks.onToolCompleted?.(data.tool_name || '');
        break;
      case 'recipe_start':
        callbacks.onRecipeStart?.();
        break;
      case 'recipe_name':
        callbacks.onRecipeName?.(typeof data.content === 'string' ? data.content : '');
        break;
      case 'recipe_description':
        callbacks.onRecipeDescription?.(typeof data.content === 'string' ? data.content : '');
        break;
      case 'recipe_metadata':
        if (data.content && typeof data.content === 'object') {
          callbacks.onRecipeMetadata?.(data.content as StreamRecipeMetadata);
        }
        break;
      case 'ingredients_start':
        callbacks.onIngredientsStart?.();
        break;
      case 'ingredient':
        if (data.content && typeof data.content === 'object') {
          callbacks.onIngredient?.(data.content as Ingredient);
        }
        break;
      case 'instructions_start':
        callbacks.onInstructionsStart?.();
        break;
      case 'instruction':
        callbacks.onInstruction?.(
          data.step || 0,
          typeof data.content === 'string' ? data.content : ''
        );
        break;
      case 'nutrition':
        if (data.content && typeof data.content === 'object') {
          callbacks.onNutrition?.(data.content as NutritionFacts);
        }
        break;
      case 'complete':
        callbacks.onComplete?.(
          data.recipe_id || 0,
          data.message || 'Complete',
          data.thinking_length
        );
        break;
      case 'error':
        callbacks.onError?.(data.message || 'Unknown error');
        break;
      default:
        console.warn('Unknown stream message type', data.type);
    }
  }

  async getRecipes(skip = 0, limit = 20): Promise<Recipe[]> {
    const response = await api.get<Recipe[]>('/recipes/', { params: { skip, limit } });
    return response.data;
  }

  async getRecipe(id: number): Promise<Recipe> {
    const response = await api.get<Recipe>(`/recipes/${id}`);
    return response.data;
  }

  async getRecipesPaginated(params: RecipeListParams): Promise<PaginatedResponse<Recipe>> {
    const response = await api.get<PaginatedResponse<Recipe>>('/recipes/list', {
      params: {
        page: params.page ?? 1,
        page_size: params.pageSize ?? 12,
        q: params.q || undefined,
        tags: params.tags && params.tags.length > 0 ? params.tags : undefined,
        sort: params.sort ?? 'created_at',
        order: params.order ?? 'desc',
      },
    });
    return response.data;
  }

  async updateRecipe(id: number, updates: Partial<Recipe>): Promise<Recipe> {
    const response = await api.put<Recipe>(`/recipes/${id}`, updates);
    return response.data;
  }

  async deleteRecipe(id: number): Promise<void> {
    await api.delete(`/recipes/${id}`);
  }

  async addFeedback(recipeId: number, feedback: RecipeFeedback): Promise<RecipeFeedbackResponse> {
    const response = await api.post<RecipeFeedbackResponse>(
      `/recipes/${recipeId}/feedback`,
      feedback
    );
    return response.data;
  }
}

export default new RecipeService();
