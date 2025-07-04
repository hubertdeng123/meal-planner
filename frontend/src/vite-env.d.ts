/// <reference types="vite/client" />

// Global types for test environment
declare global {
  var alert: (message?: string) => void;
  var confirm: (message?: string) => boolean;
  var fetch: typeof globalThis.fetch;
}
