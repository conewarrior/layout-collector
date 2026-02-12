import { describe, test, expect } from 'vitest';
import { isRestrictedUrl } from './messaging';

describe('messaging utilities', () => {
  describe('isRestrictedUrl', () => {
    test('detects chrome:// URLs', () => {
      expect(isRestrictedUrl('chrome://extensions')).toBe(true);
      expect(isRestrictedUrl('chrome://settings')).toBe(true);
    });

    test('detects about: URLs', () => {
      expect(isRestrictedUrl('about:blank')).toBe(true);
      expect(isRestrictedUrl('about:config')).toBe(true);
    });

    test('detects chrome-extension:// URLs', () => {
      expect(isRestrictedUrl('chrome-extension://abc123/popup.html')).toBe(true);
    });

    test('detects data: URLs', () => {
      expect(isRestrictedUrl('data:text/html,<h1>Test</h1>')).toBe(true);
    });

    test('allows regular HTTP URLs', () => {
      expect(isRestrictedUrl('http://example.com')).toBe(false);
      expect(isRestrictedUrl('https://example.com')).toBe(false);
    });

    test('allows file:// URLs', () => {
      expect(isRestrictedUrl('file:///path/to/file.html')).toBe(false);
    });
  });
});
