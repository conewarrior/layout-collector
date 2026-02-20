import { supabaseBrowser } from '../lib/supabase';
import type { Layout, LayoutInsert } from '../types/layout';
import type { PagePurpose, LayoutType } from '../constants/categories';

export async function checkDuplicateUrl(url: string): Promise<Layout | null> {
  const { data, error } = await supabaseBrowser
    .from('layouts')
    .select('*')
    .eq('url', url)
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}

export async function insertLayout(data: LayoutInsert): Promise<Layout> {
  const { data: layout, error } = await supabaseBrowser
    .from('layouts')
    .insert(data)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return layout;
}

export async function updateLayout(layoutId: string, data: Partial<LayoutInsert>): Promise<Layout> {
  const { data: layout, error } = await supabaseBrowser
    .from('layouts')
    .update(data)
    .eq('id', layoutId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return layout;
}

export async function uploadScreenshot(dataUrl: string, layoutId: string): Promise<string> {
  const parts = dataUrl.split(',');
  if (parts.length !== 2) {
    throw new Error('Invalid data URL format');
  }
  
  const base64 = parts[1]!;
  const binary = atob(base64);
  const array = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    array[i] = binary.charCodeAt(i);
  }
  const blob = new Blob([array], { type: 'image/jpeg' });

  const path = `${layoutId}.jpg`;
  const { data, error } = await supabaseBrowser.storage
    .from('screenshots')
    .upload(path, blob, { upsert: true });

  if (error) throw new Error(error.message);
  return data.path;
}

export async function updateScreenshotPath(
  layoutId: string,
  screenshotPath: string
): Promise<void> {
  const { data, error } = await supabaseBrowser
    .from('layouts')
    .update({ screenshot_path: screenshotPath })
    .eq('id', layoutId)
    .select('id')
    .single();

  if (error) throw new Error(error.message);
  if (!data) throw new Error('스크린샷 경로 업데이트에 실패했습니다');
}

interface GetLayoutsFilters {
  page_purpose?: PagePurpose;
  layout_type?: LayoutType;
  search?: string;
  page?: number;
}

export async function getLayouts(filters?: GetLayoutsFilters): Promise<Layout[]> {
  const page = filters?.page || 1;
  const limit = 20;
  const start = (page - 1) * limit;
  const end = start + limit - 1;

  let query = supabaseBrowser.from('layouts').select('*');

  if (filters?.page_purpose) {
    query = query.eq('page_purpose', filters.page_purpose);
  }

  if (filters?.layout_type) {
    query = query.eq('layout_type', filters.layout_type);
  }

  if (filters?.search) {
    query = query.textSearch('search_vector', filters.search);
  }

  const { data, error } = await query.range(start, end);

  if (error) throw new Error(error.message);
  return data || [];
}

export async function deleteLayout(
  layoutId: string,
  screenshotPath?: string
): Promise<void> {
  if (screenshotPath) {
    const { error: storageError } = await supabaseBrowser.storage
      .from('screenshots')
      .remove([screenshotPath]);

    if (storageError) throw new Error(storageError.message);
  }

  const { error } = await supabaseBrowser
    .from('layouts')
    .delete()
    .eq('id', layoutId);

  if (error) throw new Error(error.message);
}

export function getScreenshotUrl(screenshotPath: string): string {
  const { data } = supabaseBrowser.storage
    .from('screenshots')
    .getPublicUrl(screenshotPath);

  return data.publicUrl;
}