import { describe, test, expect } from 'vitest';
import backgroundScript from '../../entrypoints/background';

describe('background script', () => {
  test('exports default object with main function', () => {
    expect(backgroundScript).toBeDefined();
    expect(backgroundScript).toHaveProperty('main');
    expect(typeof backgroundScript.main).toBe('function');
  });
});
