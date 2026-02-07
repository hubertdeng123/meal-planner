import { api } from './api';
import type {
  GroceryList,
  MealPlan,
  MealPlanCreate,
  MealPlanItem,
  MealPlanItemCreate,
  MealPlanList,
  PaginatedResponse,
} from '../types';

export interface MealPlanListParams {
  page?: number;
  pageSize?: number;
  q?: string;
  sort?: 'created_at' | 'name' | 'start_date';
  order?: 'asc' | 'desc';
}

class MealPlanService {
  async getMealPlans(skip = 0, limit = 20): Promise<MealPlanList[]> {
    const response = await api.get<MealPlanList[]>('/meal-plans/', { params: { skip, limit } });
    return response.data;
  }

  async getMealPlansPaginated(
    params: MealPlanListParams
  ): Promise<PaginatedResponse<MealPlanList>> {
    const response = await api.get<PaginatedResponse<MealPlanList>>('/meal-plans/list', {
      params: {
        page: params.page ?? 1,
        page_size: params.pageSize ?? 12,
        q: params.q || undefined,
        sort: params.sort ?? 'created_at',
        order: params.order ?? 'desc',
      },
    });
    return response.data;
  }

  async createMealPlan(payload: MealPlanCreate): Promise<MealPlan> {
    const response = await api.post<MealPlan>('/meal-plans/', payload);
    return response.data;
  }

  async getMealPlan(id: number): Promise<MealPlan> {
    const response = await api.get<MealPlan>(`/meal-plans/${id}`);
    return response.data;
  }

  async updateMealPlan(id: number, payload: Partial<MealPlanCreate>): Promise<MealPlan> {
    const response = await api.put<MealPlan>(`/meal-plans/${id}`, payload);
    return response.data;
  }

  async deleteMealPlan(id: number): Promise<void> {
    await api.delete(`/meal-plans/${id}`);
  }

  async addMealPlanItem(mealPlanId: number, payload: MealPlanItemCreate): Promise<MealPlanItem> {
    const response = await api.post<MealPlanItem>(`/meal-plans/${mealPlanId}/items`, payload);
    return response.data;
  }

  async updateMealPlanItem(
    mealPlanId: number,
    itemId: number,
    payload: Partial<MealPlanItemCreate>
  ): Promise<MealPlanItem> {
    const response = await api.put<MealPlanItem>(
      `/meal-plans/${mealPlanId}/items/${itemId}`,
      payload
    );
    return response.data;
  }

  async deleteMealPlanItem(mealPlanId: number, itemId: number): Promise<void> {
    await api.delete(`/meal-plans/${mealPlanId}/items/${itemId}`);
  }

  async autofill(mealPlanId: number): Promise<{ created_count: number; message: string }> {
    const response = await api.post<{ created_count: number; message: string }>(
      `/meal-plans/${mealPlanId}/autofill`
    );
    return response.data;
  }

  async createGroceryList(mealPlanId: number): Promise<GroceryList> {
    const response = await api.post<GroceryList>(`/meal-plans/${mealPlanId}/grocery-list`);
    return response.data;
  }
}

export default new MealPlanService();
