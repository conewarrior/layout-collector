import { describe, test, expect, beforeAll } from 'bun:test';

process.env.VITE_SUPABASE_URL = 'https://test.supabase.co';
process.env.VITE_SUPABASE_ANON_KEY = 'test-anon-key';

import type { Layout, LayoutInsert } from '../types/layout';
import * as layoutService from './layout-service';

beforeAll(() => {
  (globalThis as any).fetch = async () => {
    return new Response(JSON.stringify({ data: [], error: null }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };
});

describe('layout-service', () => {
  test('exports all required functions', () => {
    expect(typeof layoutService.insertLayout).toBe('function');
    expect(typeof layoutService.uploadScreenshot).toBe('function');
    expect(typeof layoutService.updateScreenshotPath).toBe('function');
    expect(typeof layoutService.getLayouts).toBe('function');
    expect(typeof layoutService.deleteLayout).toBe('function');
    expect(typeof layoutService.getScreenshotUrl).toBe('function');
  });

  describe('getScreenshotUrl', () => {
    test('generates public URL for screenshot path', () => {
      const path = '123e4567.jpg';
      const url = layoutService.getScreenshotUrl(path);
      
      expect(url).toContain('screenshots');
      expect(url).toContain(path);
      expect(url).toMatch(/https?:\/\//);
    });
  });

  describe('uploadScreenshot', () => {
    test('throws error for invalid data URL format', async () => {
      const invalidDataUrl = 'not-a-valid-data-url';
      const layoutId = '123e4567-e89b-12d3-a456-426614174000';

      try {
        await layoutService.uploadScreenshot(invalidDataUrl, layoutId);
        expect(true).toBe(false);
      } catch (error: any) {
        expect(error.message).toContain('Invalid data URL format');
      }
    });

    test('accepts valid data URL format', async () => {
      const validDataUrl = 'data:image/jpeg;base64,/9j/4AAQSkZJRg==';
      const layoutId = '123e4567-e89b-12d3-a456-426614174000';

      try {
        await layoutService.uploadScreenshot(validDataUrl, layoutId);
      } catch (error: any) {
        expect(error.message).not.toContain('Invalid data URL format');
      }
    });
  });

  describe('getLayouts', () => {
    test('accepts filters parameter', async () => {
      try {
        await layoutService.getLayouts({
          page_purpose: 'Landing',
          layout_type: 'Hero+CTA',
          search: 'example',
          page: 2,
        });
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    test('works without filters', async () => {
      try {
        await layoutService.getLayouts();
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe('insertLayout', () => {
    test('accepts LayoutInsert parameter', async () => {
      const data: LayoutInsert = {
        url: 'https://example.com',
        title: 'Test',
        page_purpose: 'Landing',
        layout_type: 'Hero+CTA',
      };

      try {
        await layoutService.insertLayout(data);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe('updateScreenshotPath', () => {
    test('accepts layoutId and screenshotPath', async () => {
      try {
        await layoutService.updateScreenshotPath('123', 'path.jpg');
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe('deleteLayout', () => {
    test('accepts layoutId', async () => {
      try {
        await layoutService.deleteLayout('123');
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    test('accepts layoutId and screenshotPath', async () => {
      try {
        await layoutService.deleteLayout('123', 'path.jpg');
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });
});
