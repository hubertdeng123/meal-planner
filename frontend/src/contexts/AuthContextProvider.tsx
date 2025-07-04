import { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import authService from '../services/auth.service';
import { setLogoutFunction } from '../services/api';
import { AuthContext } from './AuthContext';

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  const logout = () => {
    authService.logout();
    setIsAuthenticated(false);
  };

  useEffect(() => {
    setIsAuthenticated(authService.isAuthenticated());
    setLoading(false);

    // Register logout function with API service
    setLogoutFunction(logout);
  }, []);

  const login = () => {
    setIsAuthenticated(true);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}
