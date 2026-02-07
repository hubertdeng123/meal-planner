import { api } from './api';
import type { PaginatedResponse, PantryItem, PantryItemCreate, PantryItemUpdate } from '../types';

export interface PantryListParams {
  page?: number;
  pageSize?: number;
  q?: string;
  sort?: 'updated_at' | 'name' | 'expires_at';
  order?: 'asc' | 'desc';
}

class PantryService {
  async getPantryItems(params: PantryListParams): Promise<PaginatedResponse<PantryItem>> {
    const response = await api.get<PaginatedResponse<PantryItem>>('/pantry/', {
      params: {
        page: params.page ?? 1,
        page_size: params.pageSize ?? 20,
        q: params.q || undefined,
        sort: params.sort ?? 'updated_at',
        order: params.order ?? 'desc',
      },
    });
    return response.data;
  }

  async createPantryItem(payload: PantryItemCreate): Promise<PantryItem> {
    const response = await api.post<PantryItem>('/pantry/items', payload);
    return response.data;
  }

  async updatePantryItem(id: number, payload: PantryItemUpdate): Promise<PantryItem> {
    const response = await api.put<PantryItem>(`/pantry/items/${id}`, payload);
    return response.data;
  }

  async deletePantryItem(id: number): Promise<void> {
    await api.delete(`/pantry/items/${id}`);
  }
}

export default new PantryService();
