-- Create layouts table with full-text search and RLS
CREATE TABLE layouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url TEXT NOT NULL,
  title TEXT,
  description TEXT,
  og_image TEXT,
  og_title TEXT,
  og_description TEXT,
  og_type TEXT,
  favicon_url TEXT,
  screenshot_path TEXT,
  page_purpose TEXT NOT NULL,
  layout_type TEXT NOT NULL,
  raw_metadata JSONB DEFAULT '{}',
  ai_category JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  search_vector tsvector GENERATED ALWAYS AS (
    to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, '') || ' ' || coalesce(url, ''))
  ) STORED
);

-- Create indexes for common queries
CREATE INDEX idx_layouts_page_purpose ON layouts(page_purpose);
CREATE INDEX idx_layouts_layout_type ON layouts(layout_type);
CREATE INDEX idx_layouts_created_at ON layouts(created_at DESC);
CREATE INDEX idx_layouts_url ON layouts(url);

-- Create GIN index for full-text search
CREATE INDEX idx_layouts_search ON layouts USING GIN(search_vector);

-- Enable Row Level Security
ALTER TABLE layouts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for anon role (wide-open access)
CREATE POLICY "anon_select" ON layouts
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "anon_insert" ON layouts
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "anon_delete" ON layouts
  FOR DELETE
  TO anon
  USING (true);
