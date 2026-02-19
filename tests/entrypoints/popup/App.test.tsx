// @vitest-environment jsdom
import React from 'react';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import App from '../../../entrypoints/popup/App';

// --- Mocks ---

const mockInsertLayout = vi.fn();
const mockUploadScreenshot = vi.fn();
const mockUpdateScreenshotPath = vi.fn();

vi.mock('@/services/layout-service', () => ({
  insertLayout: (...args: any[]) => mockInsertLayout(...args),
  uploadScreenshot: (...args: any[]) => mockUploadScreenshot(...args),
  updateScreenshotPath: (...args: any[]) => mockUpdateScreenshotPath(...args),
}));

const mockCaptureCurrentTab = vi.fn();
const mockExtractMetadata = vi.fn();
const mockIsRestrictedUrl = vi.fn();

vi.mock('@/lib/messaging', () => ({
  captureCurrentTab: (...args: any[]) => mockCaptureCurrentTab(...args),
  extractMetadata: (...args: any[]) => mockExtractMetadata(...args),
  isRestrictedUrl: (...args: any[]) => mockIsRestrictedUrl(...args),
}));

// Mock chrome API
const mockTabsQuery = vi.fn();
(globalThis as any).chrome = {
  tabs: { query: mockTabsQuery },
  runtime: { lastError: null, sendMessage: vi.fn() },
};

// --- Helpers ---

const FAKE_TAB = {
  id: 1,
  url: 'https://example.com',
  title: 'Example Site',
};

const FAKE_METADATA = {
  title: 'Example Site',
  description: 'A test page',
  og_image: 'https://example.com/og.jpg',
  og_title: 'OG Title',
  og_description: 'OG Desc',
  og_type: 'website',
  favicon_url: 'https://example.com/favicon.ico',
};

const FAKE_SCREENSHOT = 'data:image/jpeg;base64,/9j/4AAQ';

function setupNormalTab() {
  mockTabsQuery.mockResolvedValue([FAKE_TAB]);
  mockIsRestrictedUrl.mockReturnValue(false);
  mockExtractMetadata.mockResolvedValue(FAKE_METADATA);
  mockCaptureCurrentTab.mockResolvedValue(FAKE_SCREENSHOT);
}

function setupRestrictedTab() {
  mockTabsQuery.mockResolvedValue([{ id: 1, url: 'chrome://extensions', title: 'Extensions' }]);
  mockIsRestrictedUrl.mockReturnValue(true);
}

// --- Tests ---

describe('Popup App', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('renders UI elements', () => {
    test('shows URL, selects, and save button', async () => {
      setupNormalTab();
      await act(async () => {
        render(<App />);
      });

      expect(screen.getByText('https://example.com')).toBeDefined();
      expect(screen.getByText('Example Site')).toBeDefined();
      expect(screen.getByLabelText('Page Purpose')).toBeDefined();
      expect(screen.getByLabelText('Layout Type')).toBeDefined();
      expect(screen.getByRole('button', { name: /save layout/i })).toBeDefined();
    });

    test('shows screenshot preview', async () => {
      setupNormalTab();
      await act(async () => {
        render(<App />);
      });

      const img = screen.getByAltText('Screenshot preview') as HTMLImageElement;
      expect(img.src).toContain('data:image/jpeg');
    });
  });

  describe('save button disabled state', () => {
    test('Save button disabled when no categories selected', async () => {
      setupNormalTab();
      await act(async () => {
        render(<App />);
      });

      const saveBtn = screen.getByRole('button', { name: /save layout/i }) as HTMLButtonElement;
      expect(saveBtn.disabled).toBe(true);
    });

    test('Save button enabled after both categories selected', async () => {
      setupNormalTab();
      await act(async () => {
        render(<App />);
      });

      fireEvent.change(screen.getByLabelText('Page Purpose'), { target: { value: 'Landing' } });
      fireEvent.change(screen.getByLabelText('Layout Type'), { target: { value: 'Hero+CTA' } });

      const saveBtn = screen.getByRole('button', { name: /save layout/i }) as HTMLButtonElement;
      expect(saveBtn.disabled).toBe(false);
    });

    test('Save button disabled when only one category selected', async () => {
      setupNormalTab();
      await act(async () => {
        render(<App />);
      });

      fireEvent.change(screen.getByLabelText('Page Purpose'), { target: { value: 'Landing' } });

      const saveBtn = screen.getByRole('button', { name: /save layout/i }) as HTMLButtonElement;
      expect(saveBtn.disabled).toBe(true);
    });
  });

  describe('save success', () => {
    test('calls insertLayout, uploadScreenshot, updateScreenshotPath on save', async () => {
      setupNormalTab();
      mockInsertLayout.mockResolvedValue({ id: 'layout-123' });
      mockUploadScreenshot.mockResolvedValue('layout-123.jpg');
      mockUpdateScreenshotPath.mockResolvedValue(undefined);

      await act(async () => {
        render(<App />);
      });

      fireEvent.change(screen.getByLabelText('Page Purpose'), { target: { value: 'Landing' } });
      fireEvent.change(screen.getByLabelText('Layout Type'), { target: { value: 'Hero+CTA' } });

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /save layout/i }));
      });

      expect(mockInsertLayout).toHaveBeenCalledWith(
        expect.objectContaining({
          url: 'https://example.com',
          page_purpose: 'Landing',
          layout_type: 'Hero+CTA',
        })
      );
      expect(mockUploadScreenshot).toHaveBeenCalledWith(FAKE_SCREENSHOT, 'layout-123');
      expect(mockUpdateScreenshotPath).toHaveBeenCalledWith('layout-123', 'layout-123.jpg');
    });

    test('shows success message after save', async () => {
      setupNormalTab();
      mockInsertLayout.mockResolvedValue({ id: 'layout-123' });
      mockUploadScreenshot.mockResolvedValue('layout-123.jpg');
      mockUpdateScreenshotPath.mockResolvedValue(undefined);

      await act(async () => {
        render(<App />);
      });

      fireEvent.change(screen.getByLabelText('Page Purpose'), { target: { value: 'Landing' } });
      fireEvent.change(screen.getByLabelText('Layout Type'), { target: { value: 'Card Grid' } });

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /save layout/i }));
      });

      expect(screen.getByText('Layout saved successfully!')).toBeDefined();
    });
  });

  describe('save failure / network error', () => {
    test('shows error message and re-enables button on failure', async () => {
      setupNormalTab();
      mockInsertLayout.mockRejectedValue(new Error('Network error'));

      await act(async () => {
        render(<App />);
      });

      fireEvent.change(screen.getByLabelText('Page Purpose'), { target: { value: 'Dashboard' } });
      fireEvent.change(screen.getByLabelText('Layout Type'), { target: { value: 'Data Table' } });

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /save layout/i }));
      });

      expect(screen.getByText('Network error')).toBeDefined();
      const saveBtn = screen.getByRole('button', { name: /save layout/i }) as HTMLButtonElement;
      expect(saveBtn.disabled).toBe(false);
    });
  });

  describe('restricted URL', () => {
    test('shows error and disables save for restricted URLs', async () => {
      setupRestrictedTab();
      await act(async () => {
        render(<App />);
      });

      expect(screen.getByText('Cannot capture this page')).toBeDefined();
      const saveBtn = screen.getByRole('button', { name: /save layout/i }) as HTMLButtonElement;
      expect(saveBtn.disabled).toBe(true);
    });

    test('does not show screenshot preview for restricted URLs', async () => {
      setupRestrictedTab();
      await act(async () => {
        render(<App />);
      });

      expect(screen.queryByAltText('Screenshot preview')).toBeNull();
    });

    test('does not call captureCurrentTab for restricted URLs', async () => {
      setupRestrictedTab();
      await act(async () => {
        render(<App />);
      });

      expect(mockCaptureCurrentTab).not.toHaveBeenCalled();
      expect(mockExtractMetadata).not.toHaveBeenCalled();
    });
  });
});
