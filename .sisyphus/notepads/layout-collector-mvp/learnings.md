# Layout Collector MVP — Learnings & Patterns

## Task 2: Supabase Schema + Storage Bucket

### RLS Setup Patterns

#### Wide-Open Anon Strategy
For small internal teams (2-5 people) without authentication:
- Use `anon` role with permissive policies
- Pattern: `USING (true)` and `WITH CHECK (true)` for full access
- Enables: SELECT, INSERT, DELETE without user context
- Security: Relies on API key management, not row-level filtering

**Implementation:**
```sql
ALTER TABLE layouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_select" ON layouts FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert" ON layouts FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_delete" ON layouts FOR DELETE TO anon USING (true);
```

### Full-Text Search with Generated Columns

#### tsvector Generation Pattern
PostgreSQL's `tsvector` for full-text search requires:
1. **Generated Column**: Use `GENERATED ALWAYS AS ... STORED` syntax
2. **Concatenation**: Combine multiple text fields with `||` operator
3. **Coalesce**: Handle NULL values with `COALESCE(field, '')`
4. **Language**: Specify language for stemming (`'english'`)
5. **GIN Index**: Required for performance on tsvector columns

**Implementation:**
```sql
search_vector tsvector GENERATED ALWAYS AS (
  to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, '') || ' ' || coalesce(url, ''))
) STORED;
CREATE INDEX idx_layouts_search ON layouts USING GIN(search_vector);
```

**Why STORED not VIRTUAL:**
- STORED: Persisted on disk, faster queries, slower inserts
- VIRTUAL: Computed on-the-fly, slower queries, faster inserts
- Choice: STORED for read-heavy layout gallery

### Storage Bucket Configuration

#### Supabase Storage Limitations
- **Cannot create via SQL**: Storage buckets are managed separately from database
- **Three creation methods**: CLI, API, Dashboard
- **Public bucket**: Set `public: true` in bucket config
- **File paths**: Use `{layoutId}.jpg` naming for easy retrieval

**Public URL Pattern:**
```
https://[PROJECT_ID].supabase.co/storage/v1/object/public/screenshots/{layoutId}.jpg
```

### Schema Design Decisions

#### Column Choices
- **No UNIQUE on url**: Allows duplicate URLs (design changes over time)
- **ai_category nullable JSONB**: Reserved for future AI classification
- **raw_metadata JSONB**: Extensible for additional metadata
- **screenshot_path TEXT**: Stores relative path, not full URL

#### Index Strategy
- **page_purpose + layout_type**: Frequent filter columns
- **created_at DESC**: Gallery sorting (newest first)
- **url**: Quick lookups for duplicate detection
- **search_vector GIN**: Full-text search performance

### Verification Approach

#### SQL Verification Queries
Created `supabase/verify-schema.sql` with 5 verification queries:
1. Column existence and types
2. Index creation
3. RLS enablement
4. RLS policy details
5. Generated column confirmation

**Key assertion**: All 16 columns + 5 indexes + 3 policies must exist

### Environment Setup

#### Build-Time Configuration
- Use `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` environment variables
- Vite automatically loads from `.env.local`
- Bun respects `.env` files without dotenv package

#### Service Worker Considerations
- Supabase JS client requires `persistSession: false` in service workers
- No session persistence in background scripts
- Popup/Side Panel use standard client configuration

### Documentation Artifacts

#### Created Files
1. **001_create_layouts.sql**: Complete schema with RLS policies
2. **002_create_storage_bucket.sql**: Storage bucket setup instructions
3. **verify-schema.sql**: Verification queries
4. **SUPABASE_SETUP.md**: Comprehensive setup guide with curl examples

#### Key Sections
- Table schema with all 16 columns
- Index strategy and rationale
- RLS policy definitions
- Storage bucket creation methods
- CRUD operation examples
- Environment variable setup

### Next Task Dependencies

#### Task 3 (Data Layer) Requires
- Column names from schema (url, title, description, etc.)
- RLS policy understanding (anon role access)
- Storage bucket name ("screenshots")
- Generated column behavior (search_vector)

#### Task 4 (Capture) Requires
- screenshot_path column for storage references
- page_purpose and layout_type columns for categorization
- raw_metadata JSONB for extensibility

### Gotchas & Lessons

1. **Storage buckets are not SQL**: Cannot be created in migrations
2. **Generated columns need GIN indexes**: Regular B-tree indexes don't work for tsvector
3. **COALESCE is essential**: NULL values break tsvector generation
4. **Anon role is permissive**: No row-level filtering, only API key security
5. **Public URLs require bucket name**: Path is `storage/v1/object/public/{bucket}/{path}`

## Task 1: Project Scaffolding — WXT + React + TypeScript + Tailwind + shadcn/ui + Vitest

### Installation Approach
- `bun create wxt@latest` is not available via npm registry. Instead:
  1. Initialize with `bun init -y`
  2. Install WXT directly: `bun add -D wxt @wxt-dev/auto-icons`
  3. Install React/TypeScript separately: `bun add react react-dom` + `bun add -D @types/react @types/react-dom`
  4. Install Tailwind CSS 4 and PostCSS: `bun add -D tailwindcss postcss`
  5. Install shadcn/ui: `bun add -D shadcn-ui`
  6. Install Vitest: `bun add -D vitest @vitest/ui`

### WXT Configuration
- `wxt.config.ts` must define manifest properties including `side_panel` configuration
- WXT auto-generates manifest.json in `.output/chrome-mv3/` during build
- Manifest version 3 is automatically set by WXT

### Entrypoint Patterns
- **Popup**: Requires `entrypoints/popup/index.html` + `main.tsx` with `main()` function
- **Side Panel**: Requires `entrypoints/sidepanel/index.html` + `main.tsx` with `main()` function
- **Content Script**: Must export default object with `matches` and `main()` function
- **Background**: Must export default object (service worker)
- **Critical**: All runtime code MUST be inside `main()` function, not at module level

### TypeScript Configuration
- Add `"DOM"` and `"DOM.Iterable"` to `lib` array for browser APIs
- Configure path aliases: `"@/*": ["./src/*"]` for shadcn/ui imports
- Include `src/**/*` and `entrypoints/**/*` in `include` array

### Tailwind CSS 4
- Uses PostCSS-only setup (no tailwind.config.js needed)
- Create `postcss.config.js` with tailwindcss plugin
- Import Tailwind in CSS: `@import "tailwindcss";`
- No additional configuration needed for Vite integration

### Vitest Setup
- `bun test --run` works directly without custom vitest.config.ts
- Tests auto-discover `*.test.ts` and `*.test.tsx` files
- `wxt/testing` package not available in npm registry - use standard vitest instead
- `fakeBrowser` mock not needed for simple unit tests of constants

### Build Verification
- `bun run build` produces `.output/chrome-mv3/manifest.json`
- Manifest includes `"manifest_version": 3` and `"side_panel"` key
- Build output includes popup, sidepanel, background, and content script bundles

### Test Results
- Categories test passes all 4 assertions:
  - PAGE_PURPOSES length = 8 ✓
  - LAYOUT_TYPES length = 8 ✓
  - PAGE_PURPOSES values correct ✓
  - LAYOUT_TYPES values correct ✓

### TypeScript Compilation
- `bun run typecheck` (tsc --noEmit) passes with 0 errors
- Button component with React.forwardRef types correctly
- No DOM-related type errors after adding DOM libs

### Gotchas & Lessons
1. **WXT entrypoints require main() function**: Code at module level runs at build time and crashes
2. **Content script needs default export**: Must export object with matches and main()
3. **wxt/testing not in npm**: Use standard vitest for unit tests
4. **Tailwind v4 is PostCSS-only**: No tailwind.config.js file needed
5. **Path aliases need tsconfig + vite**: Both must be configured for shadcn/ui
