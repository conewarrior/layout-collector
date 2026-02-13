// @vitest-environment jsdom
import React from 'react';
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import App from './App';

// --- Mocks ---

const mockGetLayouts = vi.fn();
const mockDeleteLayout = vi.fn();
const mockGetScreenshotUrl = vi.fn();

vi.mock('../../src/services/layout-service', () => ({
  getLayouts: (...args: any[]) => mockGetLayouts(...args),
  deleteLayout: (...args: any[]) => mockDeleteLayout(...args),
  getScreenshotUrl: (...args: any[]) => mockGetScreenshotUrl(...args),
}));

const mockTabsCreate = vi.fn();
(globalThis as any).chrome = {
  tabs: { create: mockTabsCreate },
};

// --- Helpers ---

const FAKE_LAYOUTS = [
  {
    id: 'layout-1',
    url: 'https://example.com',
    title: 'Example Site',
    description: 'A test',
    og_image: null,
    og_title: null,
    og_description: null,
    og_type: null,
    favicon_url: null,
    screenshot_path: 'layout-1.jpg',
    page_purpose: 'Landing' as const,
    layout_type: 'Hero+CTA' as const,
    raw_metadata: {},
    ai_category: null,
    created_at: '2025-01-01T00:00:00Z',
  },
  {
    id: 'layout-2',
    url: 'https://dashboard.io',
    title: 'Dashboard App',
    description: null,
    og_image: null,
    og_title: null,
    og_description: null,
    og_type: null,
    favicon_url: null,
    screenshot_path: 'layout-2.jpg',
    page_purpose: 'Dashboard' as const,
    layout_type: 'Sidebar+Content' as const,
    raw_metadata: {},
    ai_category: null,
    created_at: '2025-01-02T00:00:00Z',
  },
  {
    id: 'layout-3',
    url: 'https://blog.dev',
    title: 'Dev Blog',
    description: null,
    og_image: null,
    og_title: null,
    og_description: null,
    og_type: null,
    favicon_url: null,
    screenshot_path: null,
    page_purpose: 'Blog/Content' as const,
    layout_type: 'F-Pattern' as const,
    raw_metadata: {},
    ai_category: null,
    created_at: '2025-01-03T00:00:00Z',
  },
];

// --- Tests ---

describe('SidePanel App', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetScreenshotUrl.mockImplementation((path: string) => `https://storage.test/${path}`);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('renders gallery', () => {
    test('shows layout cards with title, URL, and badges', async () => {
      mockGetLayouts.mockResolvedValue(FAKE_LAYOUTS);

      await act(async () => {
        render(<App />);
      });

      expect(screen.getByText('Example Site')).toBeDefined();
      expect(screen.getByText('https://example.com')).toBeDefined();

      // Badges exist (use getAllByText since filter options share text)
      const landingBadges = screen.getAllByText('Landing');
      expect(landingBadges.length).toBeGreaterThanOrEqual(2); // option + badge
      const heroBadges = screen.getAllByText('Hero+CTA');
      expect(heroBadges.length).toBeGreaterThanOrEqual(2); // option + badge

      expect(screen.getByText('Dashboard App')).toBeDefined();
      expect(screen.getByText('Dev Blog')).toBeDefined();
    });

    test('shows screenshot images with correct src', async () => {
      mockGetLayouts.mockResolvedValue(FAKE_LAYOUTS);

      await act(async () => {
        render(<App />);
      });

      const images = screen.getAllByRole('img');
      // layout-3 has no screenshot, so only 2 images
      expect(images.length).toBe(2);
      expect((images[0] as HTMLImageElement).src).toBe('https://storage.test/layout-1.jpg');
    });
  });

  describe('empty state', () => {
    test('shows empty message when no layouts', async () => {
      mockGetLayouts.mockResolvedValue([]);

      await act(async () => {
        render(<App />);
      });

      expect(screen.getByText('No layouts saved yet')).toBeDefined();
    });
  });

  describe('filter', () => {
    test('calls getLayouts with page_purpose filter', async () => {
      mockGetLayouts.mockResolvedValue(FAKE_LAYOUTS);

      await act(async () => {
        render(<App />);
      });

      mockGetLayouts.mockClear();
      mockGetLayouts.mockResolvedValue([FAKE_LAYOUTS[0]!]);

      await act(async () => {
        fireEvent.change(screen.getByLabelText('Filter by purpose'), { target: { value: 'Landing' } });
      });

      expect(mockGetLayouts).toHaveBeenCalledWith(
        expect.objectContaining({ page_purpose: 'Landing', page: 1 })
      );
    });

    test('calls getLayouts with layout_type filter', async () => {
      mockGetLayouts.mockResolvedValue(FAKE_LAYOUTS);

      await act(async () => {
        render(<App />);
      });

      mockGetLayouts.mockClear();
      mockGetLayouts.mockResolvedValue([FAKE_LAYOUTS[1]!]);

      await act(async () => {
        fireEvent.change(screen.getByLabelText('Filter by layout type'), { target: { value: 'Card Grid' } });
      });

      expect(mockGetLayouts).toHaveBeenCalledWith(
        expect.objectContaining({ layout_type: 'Card Grid', page: 1 })
      );
    });
  });

  describe('search with debounce', () => {
    test('does not call getLayouts immediately on search input', async () => {
      mockGetLayouts.mockResolvedValue(FAKE_LAYOUTS);

      await act(async () => {
        render(<App />);
      });

      mockGetLayouts.mockClear();

      await act(async () => {
        fireEvent.change(screen.getByLabelText('Search layouts'), { target: { value: 'landing' } });
      });

      // Immediately after typing, no new call yet
      expect(mockGetLayouts).not.toHaveBeenCalled();
    });

    test('calls getLayouts with search after 300ms debounce', async () => {
      mockGetLayouts.mockResolvedValue(FAKE_LAYOUTS);

      await act(async () => {
        render(<App />);
      });

      mockGetLayouts.mockClear();
      mockGetLayouts.mockResolvedValue([FAKE_LAYOUTS[0]!]);

      await act(async () => {
        fireEvent.change(screen.getByLabelText('Search layouts'), { target: { value: 'landing' } });
      });

      await act(async () => {
        vi.advanceTimersByTime(300);
      });

      expect(mockGetLayouts).toHaveBeenCalledWith(
        expect.objectContaining({ search: 'landing', page: 1 })
      );
    });
  });

  describe('delete', () => {
    test('shows confirm dialog on delete button click', async () => {
      mockGetLayouts.mockResolvedValue(FAKE_LAYOUTS);

      await act(async () => {
        render(<App />);
      });

      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      await act(async () => {
        fireEvent.click(deleteButtons[0]!);
      });

      expect(screen.getByText('Delete?')).toBeDefined();
      expect(screen.getByRole('button', { name: /confirm/i })).toBeDefined();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeDefined();
    });

    test('does not call deleteLayout on cancel', async () => {
      mockGetLayouts.mockResolvedValue(FAKE_LAYOUTS);

      await act(async () => {
        render(<App />);
      });

      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      await act(async () => {
        fireEvent.click(deleteButtons[0]!);
      });

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
      });

      expect(mockDeleteLayout).not.toHaveBeenCalled();
    });

    test('calls deleteLayout on confirm and removes card', async () => {
      mockGetLayouts.mockResolvedValue([...FAKE_LAYOUTS]);
      mockDeleteLayout.mockResolvedValue(undefined);

      await act(async () => {
        render(<App />);
      });

      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      await act(async () => {
        fireEvent.click(deleteButtons[0]!);
      });

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /confirm/i }));
      });

      expect(mockDeleteLayout).toHaveBeenCalledWith('layout-1', 'layout-1.jpg');
      expect(screen.queryByText('Example Site')).toBeNull();
      expect(screen.getByText('Dashboard App')).toBeDefined();
    });
  });

  describe('card click', () => {
    test('opens URL in new tab on card click', async () => {
      mockGetLayouts.mockResolvedValue(FAKE_LAYOUTS);

      await act(async () => {
        render(<App />);
      });

      const openButton = screen.getByLabelText('Open Example Site');
      await act(async () => {
        fireEvent.click(openButton);
      });

      expect(mockTabsCreate).toHaveBeenCalledWith({ url: 'https://example.com' });
    });
  });

  describe('load more', () => {
    test('shows Load More button when 20 results returned', async () => {
      const twentyLayouts = Array.from({ length: 20 }, (_, i) => ({
        ...FAKE_LAYOUTS[0]!,
        id: `layout-${i}`,
        title: `Layout ${i}`,
      }));
      mockGetLayouts.mockResolvedValue(twentyLayouts);

      await act(async () => {
        render(<App />);
      });

      expect(screen.getByRole('button', { name: /load more/i })).toBeDefined();
    });

    test('hides Load More when less than 20 results', async () => {
      mockGetLayouts.mockResolvedValue(FAKE_LAYOUTS); // 3 items

      await act(async () => {
        render(<App />);
      });

      expect(screen.queryByRole('button', { name: /load more/i })).toBeNull();
    });

    test('loads next page on Load More click', async () => {
      const twentyLayouts = Array.from({ length: 20 }, (_, i) => ({
        ...FAKE_LAYOUTS[0]!,
        id: `layout-${i}`,
        title: `Layout ${i}`,
      }));
      mockGetLayouts.mockResolvedValue(twentyLayouts);

      await act(async () => {
        render(<App />);
      });

      mockGetLayouts.mockClear();
      mockGetLayouts.mockResolvedValue([{ ...FAKE_LAYOUTS[0]!, id: 'layout-20', title: 'Layout 20' }]);

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /load more/i }));
      });

      expect(mockGetLayouts).toHaveBeenCalledWith(
        expect.objectContaining({ page: 2 })
      );
    });
  });
});
