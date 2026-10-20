import "@testing-library/jest-dom/vitest";

const values = new Map<string, string>();

Object.defineProperty(globalThis, "localStorage", {
  configurable: true,
  value: {
    clear: () => values.clear(),
    getItem: (key: string) => values.get(key) ?? null,
    key: (index: number) => [...values.keys()][index] ?? null,
    get length() {
      return values.size;
    },
    removeItem: (key: string) => values.delete(key),
    setItem: (key: string, value: string) => values.set(key, String(value))
  }
});

// Radix measures checkbox controls with ResizeObserver; jsdom has no layout.
if (!globalThis.ResizeObserver)
  globalThis.ResizeObserver = class {
    observe() {
      /* jsdom has no layout to observe. */
    }
    unobserve() {
      /* No observer resources are allocated. */
    }
    disconnect() {
      /* No observer resources are allocated. */
    }
  } as typeof ResizeObserver;
