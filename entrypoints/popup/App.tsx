import React, { useState, useEffect } from 'react';
import { insertLayout, uploadScreenshot, updateScreenshotPath } from '../../src/services/layout-service';
import { captureCurrentTab, extractMetadata, isRestrictedUrl } from '../../src/lib/messaging';
import type { PageMetadata } from '../../src/lib/messaging';
import { PAGE_PURPOSES, LAYOUT_TYPES, PURPOSE_META, LAYOUT_META } from '../../src/constants/categories';
import type { PagePurpose, LayoutType } from '../../src/constants/categories';
import { Button } from '../../src/components/ui/button';

export default function App() {
  const [tabUrl, setTabUrl] = useState('');
  const [tabTitle, setTabTitle] = useState('');
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<PageMetadata | null>(null);
  const [pagePurpose, setPagePurpose] = useState<PagePurpose | ''>('');
  const [layoutType, setLayoutType] = useState<LayoutType | ''>('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [restricted, setRestricted] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function init() {
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab?.url || !tab.id) {
          setError('Cannot access current tab');
          setLoading(false);
          return;
        }

        setTabUrl(tab.url);
        setTabTitle(tab.title || '');

        if (isRestrictedUrl(tab.url)) {
          setRestricted(true);
          setLoading(false);
          return;
        }

        const [meta, dataUrl] = await Promise.all([
          extractMetadata(tab.id),
          captureCurrentTab(),
        ]);

        setMetadata(meta);
        setScreenshot(dataUrl);
      } catch (err: any) {
        setError(err.message || 'Failed to load tab data');
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  const canSave = !restricted && !saving && !success && pagePurpose !== '' && layoutType !== '' && !loading;

  async function handleSave() {
    if (!canSave || !screenshot) return;

    setSaving(true);
    setError(null);

    try {
      const layout = await insertLayout({
        url: tabUrl,
        title: metadata?.title || tabTitle || null,
        description: metadata?.description || null,
        og_image: metadata?.og_image || null,
        og_title: metadata?.og_title || null,
        og_description: metadata?.og_description || null,
        og_type: metadata?.og_type || null,
        favicon_url: metadata?.favicon_url || null,
        page_purpose: pagePurpose as PagePurpose,
        layout_type: layoutType as LayoutType,
      });

      const path = await uploadScreenshot(screenshot, layout.id);
      await updateScreenshotPath(layout.id, path);

      setSuccess(true);
      setTimeout(() => window.close(), 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to save layout');
      setSaving(false);
    }
  }

  return (
    <div style={{ width: 380, minHeight: 480 }} className="p-4 flex flex-col gap-3">
      <h1 className="text-lg font-semibold">Layout Collector</h1>

      <div className="text-sm text-gray-600 truncate" title={tabUrl}>
        {tabUrl || 'Loading...'}
      </div>
      <div className="text-sm font-medium truncate" title={tabTitle}>
        {tabTitle}
      </div>

      {restricted && (
        <div className="bg-red-50 text-red-600 p-3 rounded text-sm" role="alert">
          Cannot capture this page
        </div>
      )}

      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded text-sm" role="alert">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 text-green-600 p-3 rounded text-sm" role="alert">
          Layout saved successfully!
        </div>
      )}

      {screenshot && (
        <div className="border rounded overflow-hidden">
          <img
            src={screenshot}
            alt="Screenshot preview"
            className="w-full h-auto"
          />
        </div>
      )}

      {loading && !restricted && !error && (
        <div className="text-sm text-gray-400 text-center py-4">
          Loading...
        </div>
      )}

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium" htmlFor="page-purpose">
          페이지 목적
        </label>
        <select
          id="page-purpose"
          value={pagePurpose}
          onChange={(e) => setPagePurpose(e.target.value as PagePurpose)}
          className="border rounded px-3 py-2 text-sm"
          disabled={restricted}
        >
          <option value="">목적을 선택하세요...</option>
          {PAGE_PURPOSES.map((p) => (
            <option key={p} value={p} title={PURPOSE_META[p].description}>
              {PURPOSE_META[p].label} — {PURPOSE_META[p].description}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium" htmlFor="layout-type">
          레이아웃 유형
        </label>
        <select
          id="layout-type"
          value={layoutType}
          onChange={(e) => setLayoutType(e.target.value as LayoutType)}
          className="border rounded px-3 py-2 text-sm"
          disabled={restricted}
        >
          <option value="">유형을 선택하세요...</option>
          {LAYOUT_TYPES.map((t) => (
            <option key={t} value={t} title={LAYOUT_META[t].description}>
              {LAYOUT_META[t].label} — {LAYOUT_META[t].description}
            </option>
          ))}
        </select>
      </div>

      <Button
        onClick={handleSave}
        disabled={!canSave}
        className="w-full mt-2"
      >
        {saving ? '저장 중...' : '레이아웃 저장'}
      </Button>
    </div>
  );
}
