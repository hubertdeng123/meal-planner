/// <reference types="vite/client" />
/// <reference types="@testing-library/jest-dom" />

// Global types for test environment
declare global {
  var alert: (message?: string) => void;
  var confirm: (message?: string) => boolean;
  var fetch: typeof globalThis.fetch;
  var ResizeObserver: {
    new (callback: ResizeObserverCallback): ResizeObserver;
    prototype: ResizeObserver;
  };
}
