import type { PagePurpose, LayoutType } from '../constants/categories';

/**
 * Layout database row - matches the `layouts` table schema
 */
export interface Layout {
  id: string;
  url: string;
  title: string | null;
  description: string | null;
  og_image: string | null;
  og_title: string | null;
  og_description: string | null;
  og_type: string | null;
  favicon_url: string | null;
  screenshot_path: string | null;
  page_purpose: PagePurpose;
  layout_type: LayoutType;
  raw_metadata: Record<string, any>;
  ai_category: Record<string, any> | null;
  created_at: string;
}

/**
 * Layout insert payload - omits generated fields (id, created_at, search_vector)
 */
export interface LayoutInsert {
  url: string;
  title?: string | null;
  description?: string | null;
  og_image?: string | null;
  og_title?: string | null;
  og_description?: string | null;
  og_type?: string | null;
  favicon_url?: string | null;
  screenshot_path?: string | null;
  page_purpose: PagePurpose;
  layout_type: LayoutType;
  raw_metadata?: Record<string, any>;
  ai_category?: Record<string, any> | null;
}