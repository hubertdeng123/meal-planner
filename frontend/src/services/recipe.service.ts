import { api } from './api';
import type {
  Ingredient,
  NutritionFacts,
  Recipe,
  RecipeFeedback,
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

class RecipeService {
  async generateRecipeStream(
    request: RecipeGenerationRequest,
    callbacks: StreamCallbacks
  ): Promise<void> {
    try {
      console.log('🚀 Starting recipe stream request...', request);

      const token = localStorage.getItem('access_token');
      if (!token) {
        throw new Error('No authentication token found. Please log in.');
      }

      console.log('🔑 Using auth token:', token.substring(0, 20) + '...');
      console.log('📡 Stream URL:', `${api.defaults.baseURL}/recipes/generate/stream`);

      const response = await fetch(`${api.defaults.baseURL}/recipes/generate/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(request),
      });

      console.log('📥 Response status:', response.status);
      console.log('📥 Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ HTTP error response:', errorText);
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Response body is not readable');
      }

      console.log('📖 Starting to read stream...');
      const decoder = new TextDecoder();
      let buffer = '';
      let messageCount = 0;

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          console.log('✅ Stream completed. Total messages:', messageCount);
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');

        // Keep the last incomplete line in the buffer
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              messageCount++;
              console.log(`📨 Message ${messageCount}:`, line);
              const data: StreamMessage = JSON.parse(line.substring(6));
              this.handleStreamMessage(data, callbacks);
            } catch (e) {
              console.error('❌ Failed to parse SSE data:', e, line);
            }
          } else if (line.trim() === '') {
            // Empty line is normal in SSE
            continue;
          } else {
            console.log('⚠️ Non-SSE line received:', line);
          }
        }
      }
    } catch (error) {
      console.error('❌ Stream error:', error);
      callbacks.onError?.(error instanceof Error ? error.message : 'Unknown streaming error');
    }
  }

  private handleStreamMessage(data: StreamMessage, callbacks: StreamCallbacks) {
    switch (data.type) {
      case 'status':
        callbacks.onStatus?.(data.message || '');
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
        console.log('Unknown message type:', data);
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

  async updateRecipe(id: number, updates: Partial<Recipe>): Promise<Recipe> {
    const response = await api.put<Recipe>(`/recipes/${id}`, updates);
    return response.data;
  }

  async deleteRecipe(id: number): Promise<void> {
    await api.delete(`/recipes/${id}`);
  }

  async addFeedback(
    recipeId: number,
    feedback: Omit<RecipeFeedback, 'recipe_id'>
  ): Promise<RecipeFeedback> {
    const response = await api.post<RecipeFeedback>(`/recipes/${recipeId}/feedback`, feedback);
    return response.data;
  }
}

export default new RecipeService();
