import { api } from './api';
import type { DashboardSummary } from '../types';

class DashboardService {
  async getDashboardSummary(): Promise<DashboardSummary> {
    const response = await api.get<DashboardSummary>('/dashboard/summary');
    return response.data;
  }
}

export default new DashboardService();
