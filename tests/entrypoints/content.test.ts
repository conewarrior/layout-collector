import { describe, test, expect } from 'vitest';
import contentScript from '../../entrypoints/content';

describe('content script', () => {
  test('exports default object with main and matches', () => {
    expect(contentScript).toBeDefined();
    expect(contentScript).toHaveProperty('main');
    expect(contentScript).toHaveProperty('matches');
    expect(typeof contentScript.main).toBe('function');
    expect(Array.isArray(contentScript.matches)).toBe(true);
  });

  test('matches includes <all_urls>', () => {
    expect(contentScript.matches).toContain('<all_urls>');
  });
});
