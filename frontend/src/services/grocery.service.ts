import { api } from './api';
import type {
  GroceryList,
  GroceryListCreate,
  GroceryItem,
  GroceryItemCreate,
  GroceryItemUpdate,
} from '../types';

class GroceryService {
  async getGroceryLists(skip = 0, limit = 20): Promise<GroceryList[]> {
    const response = await api.get<GroceryList[]>('/grocery/', { params: { skip, limit } });
    return response.data;
  }

  async getGroceryList(id: number): Promise<GroceryList> {
    const response = await api.get<GroceryList>(`/grocery/${id}/`);
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
    await api.delete(`/grocery/${id}/`);
  }

  async addGroceryItem(groceryListId: number, item: GroceryItemCreate): Promise<GroceryItem> {
    const response = await api.post<GroceryItem>(`/grocery/${groceryListId}/items/`, item);
    return response.data;
  }

  async updateGroceryItem(
    groceryListId: number,
    itemId: number,
    updates: GroceryItemUpdate
  ): Promise<GroceryItem> {
    const response = await api.put<GroceryItem>(
      `/grocery/${groceryListId}/items/${itemId}/`,
      updates
    );
    return response.data;
  }

  async deleteGroceryItem(groceryListId: number, itemId: number): Promise<void> {
    await api.delete(`/grocery/${groceryListId}/items/${itemId}/`);
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
