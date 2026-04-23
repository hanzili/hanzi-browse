import { afterEach, beforeEach, vi } from 'vitest';
import { cleanup } from '@testing-library/preact';

const runtimeListeners = new Set();

function createChromeMock() {
  return {
    runtime: {
      getURL: vi.fn((path) => `chrome-extension://test/${path}`),
      sendMessage: vi.fn(async () => ({})),
      onMessage: {
        addListener: vi.fn((listener) => runtimeListeners.add(listener)),
        removeListener: vi.fn((listener) => runtimeListeners.delete(listener)),
      },
    },
    tabs: {
      query: vi.fn(async () => [{ id: 123 }]),
    },
    storage: {
      local: {
        get: vi.fn(async () => ({})),
        set: vi.fn(async () => {}),
        remove: vi.fn(async () => {}),
      },
    },
  };
}

beforeEach(() => {
  runtimeListeners.clear();
  globalThis.chrome = createChromeMock();
  globalThis.fetch = vi.fn(async () => ({
    ok: true,
    json: async () => [],
    text: async () => '[]',
  }));
  globalThis.requestAnimationFrame = vi.fn((callback) => {
    callback();
    return 1;
  });
  globalThis.cancelAnimationFrame = vi.fn();
  globalThis.__emitRuntimeMessage = (message) => {
    for (const listener of runtimeListeners) listener(message);
  };
});

afterEach(() => {
  cleanup();
  delete globalThis.__emitRuntimeMessage;
  vi.restoreAllMocks();
});
