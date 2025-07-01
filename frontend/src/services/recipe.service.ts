import { api } from './api';
import type { Recipe, RecipeGenerationRequest, RecipeFeedback } from '../types';

export interface StreamMessage {
  type:
    | 'status'
    | 'thinking_start'
    | 'thinking'
    | 'thinking_stop'
    | 'content'
    | 'complete'
    | 'error';
  message?: string;
  chunk?: string;
  recipe_id?: number;
  thinking_length?: number;
}

export interface StreamCallbacks {
  onStatus?: (message: string) => void;
  onThinkingStart?: (message: string) => void;
  onThinking?: (chunk: string) => void;
  onThinkingStop?: (message: string) => void;
  onContent?: (chunk: string) => void;
  onComplete?: (recipeId: number, message: string, thinkingLength?: number) => void;
  onError?: (error: string) => void;
}

class RecipeService {
  async generateRecipe(request: RecipeGenerationRequest): Promise<Recipe> {
    const response = await api.post<Recipe>('/recipes/generate/', request);
    return response.data;
  }

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
      case 'thinking_start':
        callbacks.onThinkingStart?.(data.message || 'Hungry Helper is thinking...');
        break;
      case 'thinking':
        callbacks.onThinking?.(data.chunk || '');
        break;
      case 'thinking_stop':
        callbacks.onThinkingStop?.(data.message || 'Thinking complete');
        break;
      case 'content':
        callbacks.onContent?.(data.chunk || '');
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
