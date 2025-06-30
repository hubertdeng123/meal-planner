import { api } from './api';
import type {
  WeeklyScheduleRequest,
  WeeklyMealPlan,
  MealPlan,
  RecipeSelectionRequest,
} from '../types';

// Use the same interface as recipe service for consistency
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
  meal_plan?: WeeklyMealPlan;
  thinking_length?: number;
  details?: string;
}

export interface MealPlanStreamCallbacks {
  onStatus?: (message: string) => void;
  onThinkingStart?: (message: string) => void;
  onThinking?: (chunk: string) => void;
  onThinkingStop?: (message: string) => void;
  onContent?: (chunk: string) => void;
  onComplete?: (mealPlan: WeeklyMealPlan, message: string) => void;
  onError?: (error: string, details?: string) => void;
}

class MealPlanningService {
  async createWeeklyMealPlan(request: WeeklyScheduleRequest): Promise<WeeklyMealPlan> {
    const response = await api.post<WeeklyMealPlan>('/meal-planning/weekly-plan/', request);
    return response.data;
  }

  async createWeeklyMealPlanStreamWithCallbacks(
    request: WeeklyScheduleRequest,
    callbacks: MealPlanStreamCallbacks
  ): Promise<void> {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        throw new Error('No authentication token found. Please log in.');
      }

      const response = await fetch(`${api.defaults.baseURL}/meal-planning/weekly-plan/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
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
              console.error('Failed to parse SSE data:', e, line);
            }
          }
        }
      }
    } catch (error) {
      console.error('Stream error:', error);
      callbacks.onError?.(error instanceof Error ? error.message : 'Unknown streaming error');
    }
  }

  private handleStreamMessage(data: StreamMessage, callbacks: MealPlanStreamCallbacks) {
    switch (data.type) {
      case 'status':
        callbacks.onStatus?.(data.message || '');
        break;
      case 'thinking_start':
        callbacks.onThinkingStart?.(data.message || 'Meal Assistant is thinking...');
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
        if (data.meal_plan) {
          callbacks.onComplete?.(data.meal_plan, data.message || 'Complete');
        } else {
          callbacks.onError?.('No meal plan data received in complete message');
        }
        break;
      case 'error':
        callbacks.onError?.(data.message || 'Unknown error', data.details);
        break;
      default:
        console.log('Unknown message type:', data);
    }
  }

  async selectRecipe(selection: RecipeSelectionRequest): Promise<void> {
    await api.post('/meal-planning/select-recipe/', selection);
  }

  async updateRecipeSelection(
    mealPlanId: number,
    mealSlotIndex: number,
    recipeIndex: number
  ): Promise<void> {
    await api.post(
      `/meal-planning/meal-plans/${mealPlanId}/select-recipe/${mealSlotIndex}/${recipeIndex}`
    );
  }

  async getMealPlans(skip = 0, limit = 20): Promise<MealPlan[]> {
    const response = await api.get<MealPlan[]>('/meal-planning/meal-plans/', {
      params: { skip, limit },
    });
    return response.data;
  }

  async getMealPlan(id: number): Promise<MealPlan> {
    const response = await api.get<MealPlan>(`/meal-planning/meal-plans/${id}`);
    return response.data;
  }

  async getMealPlanDetails(id: number): Promise<WeeklyMealPlan> {
    const response = await api.get<WeeklyMealPlan>(`/meal-planning/meal-plans/${id}/details`);
    return response.data;
  }

  async generateGroceryListFromMealPlan(mealPlanId: number): Promise<any> {
    const response = await api.post(
      `/meal-planning/meal-plans/${mealPlanId}/generate-grocery-list/`
    );
    return response.data;
  }

  async deleteMealPlan(id: number): Promise<void> {
    await api.delete(`/meal-planning/meal-plans/${id}`);
  }
}

export default new MealPlanningService();
