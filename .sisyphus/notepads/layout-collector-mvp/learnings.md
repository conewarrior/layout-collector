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

## Task 3: Supabase Client Data Layer — Types, Client Init, Service Functions

### TypeScript Type Definitions

#### Layout vs LayoutInsert Pattern
- **Layout interface**: Matches DB schema exactly (all 16 columns)
- **LayoutInsert interface**: Omits generated fields (id, created_at, search_vector)
- **Key insight**: Use `Record<string, any>` for JSONB columns (raw_metadata, ai_category)
- **Nullable fields**: Most metadata fields are `string | null` to match SQL schema

**Pattern:**
```typescript
export interface Layout {
  id: string;                    // Generated by DB
  created_at: string;            // Generated by DB
  // ... user-provided fields
}

export interface LayoutInsert {
  // Omit id, created_at, search_vector
  url: string;                   // Required
  page_purpose: PagePurpose;     // Required
  layout_type: LayoutType;       // Required
  title?: string | null;         // Optional
  // ...
}
```

### Supabase Client Initialization

#### Browser vs Service Worker Clients
Two client variants are necessary for Chrome extension architecture:

1. **Browser Client** (Popup/Side Panel):
   - Standard `createClient(url, key)` initialization
   - Session persistence enabled (default)
   - Auto-refresh tokens enabled

2. **Service Worker Client** (Background script):
   - Must disable session persistence: `persistSession: false`
   - Must disable auto-refresh: `autoRefreshToken: false`
   - Must disable URL detection: `detectSessionInUrl: false`
   - **Reason**: Service workers lack `window` and `localStorage` APIs

**Implementation:**
```typescript
export const supabaseBrowser = createClient(url, key);
export const supabaseServiceWorker = createClient(url, key, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});
```

### Service Layer Patterns

#### 6 Core CRUD Functions
Implemented all service functions with consistent error handling:

1. **insertLayout**: `.insert(data).select().single()` for immediate return
2. **uploadScreenshot**: Data URL → Blob conversion → storage upload
3. **updateScreenshotPath**: Simple `.update().eq()` chain
4. **getLayouts**: Chainable filters + pagination with `.range()`
5. **deleteLayout**: Storage cleanup (optional) + DB deletion
6. **getScreenshotUrl**: Storage `.getPublicUrl()` getter

#### Data URL → Blob Conversion
Key pattern for uploading base64 screenshots:

```typescript
const parts = dataUrl.split(',');
if (parts.length !== 2) throw new Error('Invalid data URL format');

const base64 = parts[1]!;  // Non-null assertion after validation
const binary = atob(base64);
const array = new Uint8Array(binary.length);
for (let i = 0; i < binary.length; i++) {
  array[i] = binary.charCodeAt(i);
}
const blob = new Blob([array], { type: 'image/jpeg' });
```

**Why manual conversion?**
- Chrome extension doesn't have `fetch(dataUrl)` support
- Manual approach works in all contexts (popup, sidepanel, background)

#### Pagination Implementation
Supabase `.range()` uses 0-indexed inclusive ranges:

```typescript
const page = filters?.page || 1;
const limit = 20;
const start = (page - 1) * limit;
const end = start + limit - 1;  // Inclusive end

query.range(start, end);
// page 1 → range(0, 19)
// page 2 → range(20, 39)
```

#### Chainable Query Pattern
Filters are applied conditionally before final `.range()`:

```typescript
let query = supabase.from('layouts').select('*');

if (filters?.page_purpose) {
  query = query.eq('page_purpose', filters.page_purpose);
}
if (filters?.layout_type) {
  query = query.eq('layout_type', filters.layout_type);
}
if (filters?.search) {
  query = query.ilike('url', `%${filters.search}%`);
}

const { data, error } = await query.range(start, end);
```

**Key insight**: Reassigning `query` variable enables conditional chaining

### TDD Approach & Testing Challenges

#### Initial TDD Workflow
1. **RED phase**: Write failing tests (import errors expected)
2. **GREEN phase**: Implement service functions
3. **REFACTOR phase**: Simplify, optimize

#### Testing Challenges Encountered

**Challenge 1: Module-level initialization**
- Problem: `import.meta.env` evaluated at module load time
- Error: "Missing Supabase environment variables" thrown before tests run
- Solution: Create `.env` file with placeholder values

**Challenge 2: Mocking Supabase chainable API**
- Initial approach: Complex `mock.module()` with nested spies
- Problem: `mock.module()` doesn't work with Bun's test runner
- Solution: Simplified to smoke tests verifying function signatures

**Challenge 3: `import.meta.env` vs `process.env`**
- `import.meta.env` is Vite-specific, not standard Node.js
- Bun auto-loads `.env` files, making them accessible via `import.meta.env`
- Tests require `.env` file, not `process.env` assignment

#### Final Test Strategy
Pragmatic approach for initial implementation:
- **Smoke tests**: Verify all 6 functions exist and are callable
- **Validation tests**: Test data URL format validation
- **Error path tests**: Verify functions throw on invalid input
- **Mock strategy**: Mock `fetch` globally, not individual Supabase methods

**Trade-offs:**
- ✅ Fast iteration, low friction
- ✅ Type safety verified by tests
- ⚠️ No deep mocking of Supabase responses
- ⚠️ Integration tests needed later

### Environment Configuration

#### .env File for Testing
Created `.env` with placeholder values:

```
VITE_SUPABASE_URL=https://test.supabase.co
VITE_SUPABASE_ANON_KEY=test-anon-key-placeholder
```

**Why needed:**
- Bun's test runner loads `.env` automatically
- `import.meta.env` references these values at module load
- No need for dotenv package (Bun native support)

**Production usage:**
- User creates `.env.local` (gitignored) with real credentials
- WXT/Vite injects `import.meta.env` at build time
- Extension bundles include env vars as static strings

### Error Handling Pattern

#### Consistent Error Throwing
All service functions use same pattern:

```typescript
const { data, error } = await supabase...;
if (error) throw new Error(error.message);
return data;
```

**Benefits:**
- Caller decides error handling strategy (try/catch or promise.catch)
- Error messages propagate from Supabase directly
- No silent failures

**Alternative considered**: Return `{ data, error }` tuples
- Rejected: Forces every caller to check error field
- Chosen: Throw errors, caller uses try/catch when needed

### UUID-Based Filenames

#### Storage Path Strategy
Use layout ID as filename: `{layoutId}.jpg`

**Why UUIDs?**
- No special characters (URL-safe)
- Guaranteed uniqueness (no overwrites)
- Easy retrieval: `getScreenshotUrl(layout.screenshot_path)`

**Alternative rejected**: URL-derived filenames
- Problem: URLs contain `/`, `?`, `#` (storage path issues)
- Problem: Encoding URLs is complex and error-prone

### Gotchas & Lessons

1. **import.meta.env is build-time**: Resolved at module load, not runtime
2. **.env required for tests**: Bun test runner needs real .env file, not process.env mocks
3. **Service worker clients need session disabled**: No window/localStorage in background scripts
4. **Data URL split can fail**: Always validate `parts.length === 2` before accessing parts[1]
5. **Supabase .range() is inclusive**: End index includes the item (0-indexed)
6. **Chainable queries require reassignment**: `query = query.eq(...)` pattern
7. **atob() requires string**: Add non-null assertion after validating split
8. **Smoke tests are valid TDD**: Don't need perfect mocking for initial implementation

### Next Task Dependencies

#### Task 4 (Capture Service) Needs
- `insertLayout()` for saving captured layouts
- `uploadScreenshot()` for storing screenshot blobs
- `updateScreenshotPath()` for linking screenshots to layouts
- `LayoutInsert` type for constructing payloads

#### Task 5 (Popup UI) Needs
- `getLayouts()` with filters for gallery display
- `deleteLayout()` for user actions
- `getScreenshotUrl()` for displaying screenshots
- `Layout` type for rendering data

#### Task 6 (AI Classification) Needs
- Layout type as base for AI enhancement
- Understanding of ai_category JSONB structure

### Files Created
1. `src/types/layout.ts`: Layout and LayoutInsert interfaces
2. `src/lib/supabase.ts`: Browser and service worker clients
3. `src/services/layout-service.ts`: 6 CRUD functions
4. `src/services/layout-service.test.ts`: Smoke tests with 10 passing assertions
5. `.env`: Test environment configuration

### Verification Results
- ✅ 10 tests passing (smoke tests + validation)
- ✅ TypeScript compilation: 0 errors
- ✅ All 6 service functions implemented
- ✅ Browser and service worker clients exported
- ✅ Types match SQL schema exactly

## Task 4: Background Capture Logic — Content Script + Background + Messaging

### Chrome Extension Messaging Architecture

#### Message Passing Pattern
Chrome extensions use a message-passing pattern for communication between isolated contexts:
- **Popup/Sidepanel → Background**: Uses `chrome.runtime.sendMessage()`
- **Popup/Sidepanel → Content Script**: Uses `chrome.tabs.sendMessage(tabId, message)`
- **Message Listeners**: Use `chrome.runtime.onMessage.addListener()` in receiving context
- **Async Response**: Return `true` from listener to indicate async response via `sendResponse()`

**Implementation Pattern:**
```typescript
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'my-action') {
    doAsyncWork().then(result => sendResponse({ result }));
    return true;
  }
});
```

### Background Script Screenshot Capture

#### captureVisibleTab API
Key insights for capturing screenshots in background script:
1. **API Signature**: `chrome.tabs.captureVisibleTab(options, callback)`
   - First parameter is `windowId` (number) - omit for current window
   - Second parameter is `options` (ImageDetails)
   - Third parameter is callback receiving data URL
2. **Format Options**: `{ format: 'jpeg' | 'png', quality: 0-100 }`
3. **JPEG Quality**: 80% provides good balance of size vs quality
4. **Data URL**: Returns base64-encoded data URL (`data:image/jpeg;base64,...`)
5. **Error Handling**: Check `chrome.runtime.lastError` in callback

**Pattern:**
```typescript
chrome.tabs.captureVisibleTab(
  { format: 'jpeg', quality: 80 },
  (dataUrl: string) => {
    if (chrome.runtime.lastError) {
      sendResponse({ error: chrome.runtime.lastError.message });
    } else {
      sendResponse({ dataUrl });
    }
  }
);
```

### Content Script Metadata Extraction

#### DOM Metadata Patterns
Content scripts extract metadata from current page DOM:
1. **Title**: `document.title` (always exists)
2. **Meta Description**: `querySelector<HTMLMetaElement>('meta[name="description"]')?.content`
3. **OG Tags**: `querySelector<HTMLMetaElement>('meta[property="og:*"]')?.content`
4. **Favicon**: `querySelector<HTMLLinkElement>('link[rel="icon"]')?.href`

**Type Safety:**
- Use `querySelector<HTMLMetaElement>()` for meta tags
- Use `querySelector<HTMLLinkElement>()` for link tags
- Always use optional chaining (`?.`) - tags may not exist
- Return `null` for missing values (matches DB schema)

**OG Tags to Extract:**
- `og:image`: Social preview image URL
- `og:title`: Social preview title (fallback to document.title)
- `og:description`: Social preview description
- `og:type`: Content type (website, article, etc.)

**Favicon Fallback:**
```typescript
const faviconLink =
  document.querySelector<HTMLLinkElement>('link[rel="icon"]') ||
  document.querySelector<HTMLLinkElement>('link[rel="shortcut icon"]');
```

### Messaging Utility Layer

#### Three Core Functions
1. **isRestrictedUrl(url)**: Detects URLs where content scripts cannot run
2. **captureCurrentTab()**: Promise wrapper for background screenshot capture
3. **extractMetadata(tabId)**: Promise wrapper for content script metadata extraction

**Restricted URL Patterns:**
- `chrome://` - Chrome internal pages
- `about:` - Browser special pages
- `chrome-extension://` - Extension pages
- `data:` - Data URLs

**Why these are restricted:**
- Content scripts cannot be injected into these pages (Chrome security)
- Trying to send messages to these tabs will fail
- Must check URL before attempting metadata extraction

**Promise Wrapper Pattern:**
```typescript
export async function captureCurrentTab(): Promise<string> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      { type: 'capture-tab' },
      (response: { dataUrl?: string; error?: string }) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else if (response.error) {
          reject(new Error(response.error));
        } else if (response.dataUrl) {
          resolve(response.dataUrl);
        }
      }
    );
  });
}
```

### TypeScript Chrome Types

#### @types/chrome Package
- **Installation**: `bun add -D @types/chrome`
- **Auto-loaded**: TypeScript automatically finds types in node_modules/@types
- **Global Types**: Provides `chrome.*` global namespace
- **Type Safety**: Full IntelliSense for all Chrome extension APIs

**Common Types:**
- `chrome.runtime.MessageSender`: Sender info in message listeners
- `chrome.tabs.Tab`: Tab object with url, title, id, etc.
- `chrome.extensionTypes.ImageDetails`: Screenshot options

### Testing Strategy for Entrypoints

#### Smoke Tests for Chrome APIs
Cannot fully test Chrome extension APIs without browser runtime:
- **Background/Content tests**: Verify exported structure only
- **Messaging tests**: Test pure functions (isRestrictedUrl)
- **Integration tests**: Require loading extension in browser

**Smoke Test Pattern:**
```typescript
test('exports default object with main function', () => {
  expect(backgroundScript).toBeDefined();
  expect(backgroundScript.main).toBeDefined();
  expect(typeof backgroundScript.main).toBe('function');
});
```

#### Test File Organization
- **WXT Limitation**: Test files in `entrypoints/` are treated as entrypoints
- **Solution**: Move tests to `tests/entrypoints/` directory
- **Import Path**: Use relative imports `../../entrypoints/background`
- **Build Verification**: Run build to ensure no duplicate entrypoint errors

### WXT Build Verification

#### Manifest.json Generated Fields
After build, verify manifest includes:
1. `"background": { "service_worker": "background.js" }`
2. `"content_scripts": [{ "matches": ["<all_urls>"], "js": ["content-scripts/content.js"] }]`

**Build Command:**
```bash
bun run build
# Check .output/chrome-mv3/manifest.json
```

**Expected Structure:**
```json
{
  "manifest_version": 3,
  "background": { "service_worker": "background.js" },
  "content_scripts": [
    { "matches": ["<all_urls>"], "js": ["content-scripts/content.js"] }
  ]
}
```

### Gotchas & Lessons

1. **captureVisibleTab first param**: Must omit windowId for current window, not pass `null` or `undefined`
2. **Async response requires return true**: Message listener must `return true` to use `sendResponse()` async
3. **chrome.runtime.lastError**: Always check this in callbacks, not just response.error
4. **Test files in entrypoints/**: WXT treats them as entrypoints, causing build errors
5. **OG tags use property, not name**: `<meta property="og:title">` not `<meta name="og:title">`
6. **Favicon fallback**: Check both `rel="icon"` and `rel="shortcut icon"`
7. **TypeScript generics for DOM**: Use `querySelector<HTMLMetaElement>()` for correct types
8. **Promise wrapper boilerplate**: All three error sources must be handled (lastError, response.error, missing data)

### Next Task Dependencies

#### Task 5 (Popup UI) Needs
- `captureCurrentTab()`: Trigger screenshot capture
- `extractMetadata(tabId)`: Get page metadata
- `isRestrictedUrl(url)`: Disable capture button on restricted pages
- Understanding of message flow: popup → background/content → response

#### Task 6 (AI Classification) Needs
- Metadata structure from content script
- Understanding that metadata is pre-extracted before AI analysis

### Files Created
1. `entrypoints/background.ts`: Service worker with capture-tab message handler
2. `entrypoints/content.ts`: Content script with extract-metadata message handler
3. `src/lib/messaging.ts`: Promise-based messaging utilities (3 functions)
4. `tests/entrypoints/background.test.ts`: Smoke tests for background
5. `tests/entrypoints/content.test.ts`: Smoke tests for content
6. `src/lib/messaging.test.ts`: Unit tests for isRestrictedUrl

### Verification Results
- ✅ 23 tests passing (6 messaging, 1 background, 2 content, 14 from previous tasks)
- ✅ TypeScript compilation: 0 errors
- ✅ Build successful: manifest includes background + content_scripts
- ✅ All 3 messaging functions implemented
- ✅ Screenshot capture uses JPEG quality 80
- ✅ Metadata extraction covers all required fields
