import { api } from './api';
import type {
  GroceryList,
  GroceryListCreate,
  GroceryItem,
  GroceryItemCreate,
  GroceryItemUpdate,
  PaginatedResponse,
} from '../types';

export interface GroceryListParams {
  page?: number;
  pageSize?: number;
  q?: string;
  sort?: 'created_at' | 'name';
  order?: 'asc' | 'desc';
}

class GroceryService {
  async getGroceryLists(skip = 0, limit = 20): Promise<GroceryList[]> {
    const response = await api.get<GroceryList[]>('/grocery/', { params: { skip, limit } });
    return response.data;
  }

  async getGroceryListsPaginated(
    params: GroceryListParams
  ): Promise<PaginatedResponse<GroceryList>> {
    const response = await api.get<PaginatedResponse<GroceryList>>('/grocery/list', {
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

  async getGroceryList(id: number): Promise<GroceryList> {
    const response = await api.get<GroceryList>(`/grocery/${id}`);
    return response.data;
  }

  async createGroceryList(groceryList: GroceryListCreate): Promise<GroceryList> {
    const response = await api.post<GroceryList>('/grocery/', groceryList);
    return response.data;
  }

  async createGroceryListFromRecipes(recipeIds: number[]): Promise<GroceryList> {
    const response = await api.post<GroceryList>('/grocery/from-recipes/', recipeIds);
    return response.data;
  }

  async deleteGroceryList(id: number): Promise<void> {
    await api.delete(`/grocery/${id}`);
  }

  async addGroceryItem(groceryListId: number, item: GroceryItemCreate): Promise<GroceryItem> {
    const response = await api.post<GroceryItem>(`/grocery/${groceryListId}/items`, item);
    return response.data;
  }

  async updateGroceryItem(
    groceryListId: number,
    itemId: number,
    updates: GroceryItemUpdate
  ): Promise<GroceryItem> {
    const response = await api.put<GroceryItem>(
      `/grocery/${groceryListId}/items/${itemId}`,
      updates
    );
    return response.data;
  }

  async deleteGroceryItem(groceryListId: number, itemId: number): Promise<void> {
    await api.delete(`/grocery/${groceryListId}/items/${itemId}`);
  }

  async toggleGroceryItem(
    groceryListId: number,
    itemId: number,
    checked: boolean
  ): Promise<GroceryItem> {
    return this.updateGroceryItem(groceryListId, itemId, { checked });
  }
}

export default new GroceryService();
