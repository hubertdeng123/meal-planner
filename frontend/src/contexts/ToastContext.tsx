/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  toasts: Toast[];
  addToast: (message: string, type?: ToastType) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string, type: ToastType = 'info') => {
    const createdAt = Date.now();
    const id = `${createdAt}-${Math.random().toString(36).slice(2, 11)}`;
    let inserted = false;

    setToasts(prev => {
      const hasRecentDuplicate = prev.some(existingToast => {
        const existingCreatedAt = Number(existingToast.id.split('-')[0] || 0);
        return (
          existingToast.message === message &&
          existingToast.type === type &&
          createdAt - existingCreatedAt < 1500
        );
      });

      if (hasRecentDuplicate) {
        return prev;
      }

      inserted = true;
      return [...prev, { id, message, type }];
    });

    if (inserted) {
      // Auto-remove after 3 seconds
      setTimeout(() => {
        setToasts(currentToasts => currentToasts.filter(toast => toast.id !== id));
      }, 3000);
    }
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
