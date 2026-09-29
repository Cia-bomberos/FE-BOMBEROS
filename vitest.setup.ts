import '@testing-library/jest-dom/vitest';
import { vi } from "vitest";
import { webcrypto } from "node:crypto";


if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = vi.fn();
}

if (!globalThis.crypto?.subtle) {
  Object.defineProperty(globalThis, "crypto", {
    value: webcrypto,
    configurable: true,
  });
}

// jsdom no implementa getModifierState con valores personalizables
Object.defineProperty(KeyboardEvent.prototype, "getModifierState", {
  value: function (this: any, key: string) {
    return this.__capsLock === true && key === "CapsLock";
  },
  configurable: true,
});

if (!window.matchMedia) {
  window.matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(() => false),
  }) as any;
}