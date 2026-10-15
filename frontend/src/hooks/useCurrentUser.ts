import { useEffect, useState } from 'react';
import authService from '../services/auth.service';
import type { User } from '../types';

let cachedUser: User | null = null;

export function clearCachedUser(): void {
  cachedUser = null;
}

/** Profile of the signed-in user, fetched once per session and shared across components. */
export function useCurrentUser(): User | null {
  const [user, setUser] = useState<User | null>(cachedUser);

  useEffect(() => {
    if (cachedUser) return;
    let cancelled = false;
    const load = async () => {
      try {
        const data = await authService.getCurrentUser();
        cachedUser = data;
        if (!cancelled) setUser(data);
      } catch {
        // Callers render without profile details.
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return user;
}
