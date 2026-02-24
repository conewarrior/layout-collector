import React, { useState, useEffect } from 'react';
import { insertLayout, updateLayout, uploadScreenshot, updateScreenshotPath, checkDuplicateUrl } from '../../src/services/layout-service';
import { captureCurrentTab, extractMetadata, isRestrictedUrl } from '../../src/lib/messaging';
import type { PageMetadata } from '../../src/lib/messaging';
import { PAGE_PURPOSES, LAYOUT_TYPES, PURPOSE_META, LAYOUT_META } from '../../src/constants/categories';
import type { PagePurpose, LayoutType } from '../../src/constants/categories';
import { Button } from '../../src/components/ui/button';
import { Select } from '../../src/components/ui/select';

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
  const [duplicate, setDuplicate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function init() {
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab?.url || !tab.id) {
          setError('현재 탭에 접근할 수 없습니다');
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

        const [meta, dataUrl, existing] = await Promise.all([
          extractMetadata(tab.id),
          captureCurrentTab(),
          checkDuplicateUrl(tab.url),
        ]);

        setMetadata(meta);
        setScreenshot(dataUrl);

        if (existing) {
          setDuplicate(existing.id);
        }
      } catch (err: any) {
        setError(err.message || '탭 데이터를 불러오지 못했습니다');
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
      const layoutData = {
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
      };

      let layoutId: string;

      if (duplicate) {
        const updated = await updateLayout(duplicate, layoutData);
        layoutId = updated.id;
      } else {
        const created = await insertLayout(layoutData);
        layoutId = created.id;
      }

      const path = await uploadScreenshot(screenshot, layoutId);
      await updateScreenshotPath(layoutId, path);

      setSuccess(true);
      setTimeout(() => window.close(), 2000);
    } catch (err: any) {
      setError(err.message || '저장에 실패했습니다');
      setSaving(false);
    }
  }

  return (
    <div className="w-[380px] min-h-[480px] p-4 flex flex-col gap-3 bg-background text-foreground">
      <h1 className="text-lg font-semibold">Layout Collector</h1>

      <div className="text-sm text-muted-foreground truncate" title={tabUrl}>
        {tabUrl || '불러오는 중...'}
      </div>
      <div className="text-sm font-medium truncate" title={tabTitle}>
        {tabTitle}
      </div>

      {restricted && (
        <div className="bg-error-bg text-error-text p-3 rounded-md text-sm" role="alert">
          이 페이지는 캡처할 수 없습니다
        </div>
      )}

      {duplicate && (
        <div className="bg-warning-bg text-warning-text p-3 rounded-md text-sm" role="alert">
          이미 저장된 URL입니다. 다시 저장하면 기존 데이터를 덮어씁니다.
        </div>
      )}

      {error && (
        <div className="bg-error-bg text-error-text p-3 rounded-md text-sm" role="alert">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-success-bg text-success-text p-3 rounded-md text-sm" role="alert">
          {duplicate ? '레이아웃이 업데이트되었습니다!' : '레이아웃이 저장되었습니다!'}
        </div>
      )}

      {screenshot && (
        <div className="border border-border rounded-md overflow-hidden">
          <img
            src={screenshot}
            alt="Screenshot preview"
            className="w-full h-auto"
          />
        </div>
      )}

      {loading && !restricted && !error && (
        <div className="text-sm text-muted-foreground text-center py-4">
          불러오는 중...
        </div>
      )}

      <Select
        id="page-purpose"
        label="페이지 목적"
        value={pagePurpose}
        onChange={(e) => setPagePurpose(e.target.value as PagePurpose)}
        disabled={restricted}
      >
        <option value="">목적을 선택하세요...</option>
        {PAGE_PURPOSES.map((p) => (
          <option key={p} value={p} title={PURPOSE_META[p].description}>
            {PURPOSE_META[p].label} — {PURPOSE_META[p].description}
          </option>
        ))}
      </Select>

      <Select
        id="layout-type"
        label="레이아웃 유형"
        value={layoutType}
        onChange={(e) => setLayoutType(e.target.value as LayoutType)}
        disabled={restricted}
      >
        <option value="">유형을 선택하세요...</option>
        {LAYOUT_TYPES.map((t) => (
          <option key={t} value={t} title={LAYOUT_META[t].description}>
            {LAYOUT_META[t].label} — {LAYOUT_META[t].description}
          </option>
        ))}
      </Select>

      <Button
        onClick={handleSave}
        disabled={!canSave}
        className="w-full mt-2"
      >
        {saving ? '저장 중...' : duplicate ? '레이아웃 업데이트' : '레이아웃 저장'}
      </Button>
    </div>
  );
}
