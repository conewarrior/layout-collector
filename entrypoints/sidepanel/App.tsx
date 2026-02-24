import React, { useState, useEffect, useCallback, useRef } from 'react';
import { getLayouts, deleteLayout, getScreenshotUrl } from '../../src/services/layout-service';
import { PAGE_PURPOSES, LAYOUT_TYPES, PURPOSE_META, LAYOUT_META } from '../../src/constants/categories';
import type { PagePurpose, LayoutType } from '../../src/constants/categories';
import type { Layout } from '../../src/types/layout';
import { Button } from '../../src/components/ui/button';
import { Select } from '../../src/components/ui/select';

export default function App() {
  const [layouts, setLayouts] = useState<Layout[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);

  const [purposeFilter, setPurposeFilter] = useState<PagePurpose | ''>('');
  const [typeFilter, setTypeFilter] = useState<LayoutType | ''>('');
  const [searchText, setSearchText] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Debounce search input
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(searchText);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchText]);

  const fetchLayouts = useCallback(async (pageNum: number, reset: boolean) => {
    if (reset) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }
    setError(null);

    try {
      const results = await getLayouts({
        page_purpose: purposeFilter || undefined,
        layout_type: typeFilter || undefined,
        search: debouncedSearch || undefined,
        page: pageNum,
      });

      if (reset) {
        setLayouts(results);
      } else {
        setLayouts((prev) => [...prev, ...results]);
      }
      setHasMore(results.length === 20);
      setPage(pageNum);
    } catch (err: any) {
      setError(err.message || 'Failed to load layouts');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [purposeFilter, typeFilter, debouncedSearch]);

  // Load on filter/search change
  useEffect(() => {
    fetchLayouts(1, true);
  }, [fetchLayouts]);

  function handleLoadMore() {
    fetchLayouts(page + 1, false);
  }

  async function handleDelete(layout: Layout) {
    setDeletingId(layout.id);
    try {
      await deleteLayout(layout.id, layout.screenshot_path || undefined);
      setLayouts((prev) => prev.filter((l) => l.id !== layout.id));
      setConfirmDeleteId(null);
    } catch (err: any) {
      setError(err.message || 'Failed to delete layout');
    } finally {
      setDeletingId(null);
    }
  }

  function handleCardClick(url: string) {
    chrome.tabs.create({ url });
  }

  return (
    <div className="p-4 flex flex-col gap-4 min-h-screen bg-background text-foreground">
      <h1 className="text-lg font-semibold">Saved Layouts</h1>

      {/* Filter bar */}
      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          <Select
            aria-label="페이지 목적 필터"
            value={purposeFilter}
            onChange={(e) => setPurposeFilter(e.target.value as PagePurpose | '')}
            className="flex-1"
          >
            <option value="">전체 목적</option>
            {PAGE_PURPOSES.map((p) => (
              <option key={p} value={p}>{PURPOSE_META[p].label}</option>
            ))}
          </Select>

          <Select
            aria-label="레이아웃 유형 필터"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as LayoutType | '')}
            className="flex-1"
          >
            <option value="">전체 유형</option>
            {LAYOUT_TYPES.map((t) => (
              <option key={t} value={t}>{LAYOUT_META[t].label}</option>
            ))}
          </Select>
        </div>

        <input
          type="text"
          aria-label="레이아웃 검색"
          placeholder="검색..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          className="border border-input rounded-md bg-background text-foreground px-3 py-1.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
        />
      </div>

      {/* Error */}
      {error && (
        <div className="bg-error-bg text-error-text p-3 rounded-md text-sm" role="alert">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="text-sm text-muted-foreground text-center py-8">Loading...</div>
      )}

      {/* Empty state */}
      {!loading && layouts.length === 0 && (
        <div className="text-sm text-muted-foreground text-center py-8">
          No layouts saved yet
        </div>
      )}

      {/* Card grid */}
      {!loading && layouts.length > 0 && (
        <div className="grid grid-cols-1 gap-3">
          {layouts.map((layout) => (
            <div
              key={layout.id}
              className="border border-border rounded-lg overflow-hidden hover:bg-muted/50 transition-colors"
            >
              {/* Screenshot */}
              {layout.screenshot_path && (
                <button
                  type="button"
                  className="w-full cursor-pointer border-0 p-0 bg-transparent"
                  onClick={() => handleCardClick(layout.url)}
                  aria-label={`Open ${layout.title || layout.url}`}
                >
                  <img
                    src={getScreenshotUrl(layout.screenshot_path)}
                    alt={layout.title || 'Screenshot'}
                    className="w-full h-36 object-cover object-top"
                    loading="lazy"
                  />
                </button>
              )}

              <div className="p-3 flex flex-col gap-2">
                {/* Title + URL */}
                <button
                  type="button"
                  className="text-left cursor-pointer border-0 p-0 bg-transparent"
                  onClick={() => handleCardClick(layout.url)}
                >
                  <div className="text-sm font-medium truncate">
                    {layout.title || 'Untitled'}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {layout.url}
                  </div>
                </button>

                {/* Badges */}
                <div className="flex gap-1.5 flex-wrap">
                  <span className="text-xs bg-info-bg text-info-text px-2 py-0.5 rounded-sm">
                    {PURPOSE_META[layout.page_purpose].label}
                  </span>
                  <span className="text-xs bg-success-bg text-success-text px-2 py-0.5 rounded-sm">
                    {LAYOUT_META[layout.layout_type].label}
                  </span>
                </div>

                {/* Delete */}
                {confirmDeleteId === layout.id ? (
                  <div className="flex gap-2 items-center">
                    <span className="text-xs text-destructive">Delete?</span>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDelete(layout)}
                      disabled={deletingId === layout.id}
                      className="text-xs"
                    >
                      {deletingId === layout.id ? 'Deleting...' : 'Confirm'}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setConfirmDeleteId(null)}
                      className="text-xs"
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setConfirmDeleteId(layout.id)}
                    className="text-xs text-destructive self-start"
                  >
                    Delete
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Load More */}
      {!loading && hasMore && layouts.length > 0 && (
        <Button
          variant="outline"
          onClick={handleLoadMore}
          disabled={loadingMore}
          className="w-full"
        >
          {loadingMore ? 'Loading...' : 'Load More'}
        </Button>
      )}
    </div>
  );
}
