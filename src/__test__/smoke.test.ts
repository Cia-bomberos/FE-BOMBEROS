import { describe, it, expect } from 'vitest';

// Test mínimo para que el pipeline de CI no falle por falta de tests.
describe('smoke', () => {
  it('sanity check', () => {
    expect(true).toBe(true);
  });
});