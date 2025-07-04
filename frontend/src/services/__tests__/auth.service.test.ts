import { describe, it, expect, vi, beforeEach } from 'vitest';
import authService from '../auth.service';

// Mock the API module
vi.mock('../api', () => ({
  api: {
    post: vi.fn(),
    get: vi.fn(),
  },
}));

// Get the mocked functions
import { api } from '../api';
const mockApi = vi.mocked(api);

describe('AuthService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear localStorage
    localStorage.clear();
  });

  describe('login', () => {
    it('should call API with correct credentials and store token', async () => {
      const mockToken = { access_token: 'test-token', token_type: 'bearer' };
      const credentials = { email: 'test@example.com', password: 'password123' };

      mockApi.post.mockResolvedValue({ data: mockToken });

      const result = await authService.login(credentials);

      // Check that FormData was passed
      expect(mockApi.post).toHaveBeenCalledWith(
        '/auth/login',
        expect.any(FormData),
        expect.objectContaining({
          headers: { 'Content-Type': 'multipart/form-data' },
        })
      );
      expect(result).toEqual(mockToken);
      expect(localStorage.getItem('access_token')).toBe(mockToken.access_token);
    });

    it('should throw error when API call fails', async () => {
      const credentials = { email: 'test@example.com', password: 'wrong-password' };
      const error = new Error('Invalid credentials');

      mockApi.post.mockRejectedValue(error);

      await expect(authService.login(credentials)).rejects.toThrow(error);
      expect(localStorage.getItem('access_token')).toBeNull();
    });
  });

  describe('register', () => {
    it('should call API with user data and preferences', async () => {
      const userData = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'password123',
      };
      const preferences = {
        food_preferences: {
          cuisines: ['Italian'],
          favorite_ingredients: ['tomatoes'],
          cooking_methods: ['grilling'],
        },
        dietary_restrictions: ['vegetarian'],
      };
      const mockResponse = { id: 1, ...userData };

      mockApi.post.mockResolvedValue({ data: mockResponse });

      const result = await authService.register(userData, preferences);

      expect(mockApi.post).toHaveBeenCalledWith('/auth/register', {
        user_data: userData,
        preferences,
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('logout', () => {
    it('should remove token from localStorage', () => {
      localStorage.setItem('access_token', 'test-token');

      authService.logout();

      expect(localStorage.getItem('access_token')).toBeNull();
    });
  });

  describe('isAuthenticated', () => {
    it('should return true when token exists', () => {
      localStorage.setItem('access_token', 'test-token');

      expect(authService.isAuthenticated()).toBe(true);
    });

    it('should return false when token does not exist', () => {
      expect(authService.isAuthenticated()).toBe(false);
    });

    it('should return false when token is empty string', () => {
      localStorage.setItem('access_token', '');

      expect(authService.isAuthenticated()).toBe(false);
    });
  });

  describe('getCurrentUser', () => {
    it('should fetch current user from API', async () => {
      const mockUser = { id: 1, email: 'test@example.com', username: 'testuser' };

      mockApi.get.mockResolvedValue({ data: mockUser });

      const result = await authService.getCurrentUser();

      expect(mockApi.get).toHaveBeenCalledWith('/auth/me');
      expect(result).toEqual(mockUser);
    });
  });
});
