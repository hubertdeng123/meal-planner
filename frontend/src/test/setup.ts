import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock window.scrollTo
Object.defineProperty(window, 'scrollTo', {
  writable: true,
  value: vi.fn(),
});

// Mock local storage
const localStorageMock = {
  storage: new Map(),
  getItem: vi.fn((key: string) => localStorageMock.storage.get(key) || null),
  setItem: vi.fn((key: string, value: string) => localStorageMock.storage.set(key, value)),
  removeItem: vi.fn((key: string) => localStorageMock.storage.delete(key)),
  clear: vi.fn(() => localStorageMock.storage.clear()),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock alert and confirm
global.alert = vi.fn();
global.confirm = vi.fn(() => true);

// Mock fetch
global.fetch = vi.fn();

// Mock ResizeObserver for Headless UI components
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));
