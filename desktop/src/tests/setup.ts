import { afterEach } from 'vitest';
import { clearMocks } from '@tauri-apps/api/mocks';

declare global {
  interface Window {
    __TAURI_INTERNALS__?: Record<string, unknown>;
  }
}

// 1. Polyfill window and globalThis for Node test environment
if (typeof window === 'undefined') {
  (globalThis as unknown as { window: Window & typeof globalThis }).window =
    globalThis as unknown as Window & typeof globalThis;
}

// 2. Ensure __TAURI_INTERNALS__ stub exists so `isTauri` detects Tauri runtime
if (typeof window.__TAURI_INTERNALS__ === 'undefined') {
  window.__TAURI_INTERNALS__ = {};
}

// 3. Stubs for DOM elements referenced in headless utility functions (e.g. exportToCSV)
if (typeof document === 'undefined') {
  const dummyElement = {
    setAttribute: () => {},
    style: {},
    click: () => {},
  };
  const classListSet = new Set<string>();
  (globalThis as unknown as { document: unknown }).document = {
    createElement: () => dummyElement,
    body: {
      appendChild: () => {},
      removeChild: () => {},
    },
    documentElement: {
      classList: {
        add: (cls: string) => classListSet.add(cls),
        remove: (cls: string) => classListSet.delete(cls),
        toggle: (cls: string) => {
          if (classListSet.has(cls)) classListSet.delete(cls);
          else classListSet.add(cls);
        },
        contains: (cls: string) => classListSet.has(cls),
      },
    },
  };
}

if (typeof URL.createObjectURL === 'undefined') {
  URL.createObjectURL = () => 'blob:mock-url';
}
if (typeof URL.revokeObjectURL === 'undefined') {
  URL.revokeObjectURL = () => {};
}

// 4. Clean up mocks after each test
afterEach(() => {
  clearMocks();
});
