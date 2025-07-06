import { api } from './api';
import type { UserCreate, UserLogin, UserPreferences, UserUpdate, Token, User } from '../types';

class AuthService {
  async register(userData: UserCreate, preferences: UserPreferences): Promise<User> {
    const response = await api.post<User>('/auth/register', {
      user_data: userData,
      preferences,
    });
    return response.data;
  }

  async login(credentials: UserLogin): Promise<Token> {
    const formData = new FormData();
    formData.append('username', credentials.email);
    formData.append('password', credentials.password);

    const response = await api.post<Token>('/auth/login', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    if (response.data.access_token) {
      localStorage.setItem('access_token', response.data.access_token);
    }

    return response.data;
  }

  async getCurrentUser(): Promise<User> {
    const response = await api.get<User>('/auth/me');
    return response.data;
  }

  async updateCurrentUser(userUpdate: UserUpdate): Promise<User> {
    const response = await api.put<User>('/auth/me', userUpdate);
    return response.data;
  }

  async getUserPreferences(): Promise<UserPreferences> {
    const response = await api.get<UserPreferences>('/auth/me/preferences');
    return response.data;
  }

  async updateUserPreferences(preferences: UserPreferences): Promise<UserPreferences> {
    const response = await api.put<UserPreferences>('/auth/me/preferences', preferences);
    return response.data;
  }

  logout(): void {
    localStorage.removeItem('access_token');
  }

  isAuthenticated(): boolean {
    return !!localStorage.getItem('access_token');
  }
}

export default new AuthService();
