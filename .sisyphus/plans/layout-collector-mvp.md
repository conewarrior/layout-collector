# Layout Collector MVP — Chrome Extension + Supabase

## TL;DR

> **Quick Summary**: 웹 브라우징 중 마음에 드는 페이지의 URL, 스크린샷, 메타데이터를 캡처하고 수동으로 카테고리를 태깅하여 Supabase에 저장하는 Chrome 확장프로그램 MVP.
> 
> **Deliverables**:
> - WXT 기반 Chrome 확장프로그램 (Popup + Side Panel + Background + Content Script)
> - Supabase DB 스키마 (layouts 테이블) + Storage 버킷 (screenshots)
> - Vitest 기반 TDD 테스트 스위트
> 
> **Estimated Effort**: Medium (6개 태스크)
> **Parallel Execution**: YES — 2 waves
> **Critical Path**: Task 1 (Scaffold) → Task 2 (Schema) → Task 3 (Data Layer) → Task 4 (Capture) → Task 5 (Popup) → Task 6 (Side Panel)

---

## Context

### Original Request
웹 페이지 레이아웃/디자인을 수집하는 Chrome 확장프로그램. 수집된 레퍼런스를 나중에 CLI/MCP 환경에서 AI가 조회하여 디자인 생성에 활용하는 것이 최종 비전. MVP는 확장 + DB만 구현.

### Interview Summary
**Key Discussions**:
- 수집 방식: 수동 클릭 (버튼 눌렀을 때만)
- AI 분류: MVP에서는 수동 태깅 (비용 제로). 향후 AI 자동분류 확장 가능한 구조만
- DB: Supabase (클라우드, 팀 공유, Storage 포함)
- 팀: 소규모 2-5명, 인증 불필요, API 키 공유
- 카테고리: 2축 (페이지 용도 8개 + 레이아웃 타입 8개)
- UI: Popup (빠른 저장) + Side Panel (갤러리/관리)
- 테스트: TDD with Vitest

**Research Findings**:
- WXT (9.1K stars): file-based entrypoints, HMR, built-in Vitest plugin(`WxtVitest()`)
- Supabase: REST API + Storage, service worker에서 `persistSession: false` 필수
- `captureVisibleTab`: viewport만 캡처, background에서만 호출 가능
- Content Script: ISOLATED world, DOM 공유하지만 별도 JS 컨텍스트

### Metis Review
**Identified Gaps** (addressed):
- Viewport-only 스크린샷 확인 → MVP는 viewport only로 확정 (G8)
- API 키 배포 방식 → build-time `.env` 방식 채택 (소규모 팀)
- 중복 URL 처리 → 중복 허용 (시간에 따른 디자인 변화 추적)
- No-auth RLS 전략 → **유저 결정 필요** (Q4)
- 스크린샷 포맷 → JPEG quality 80 (저장 효율)
- 오프라인/에러 → Error toast, retry 없음 (MVP)
- Service worker 종료 문제 → Supabase 호출은 popup에서 수행

---

## Work Objectives

### Core Objective
Chrome 확장에서 현재 탭의 URL + 메타데이터 + 스크린샷을 캡처하고, 사용자가 카테고리(페이지 용도 + 레이아웃 타입)를 선택하여 Supabase에 저장. Side Panel에서 저장된 레이아웃을 갤러리로 조회/필터링/삭제.

### Concrete Deliverables
- Chrome 확장프로그램 (`.output/chrome-mv3/`)
- Supabase `layouts` 테이블 + `screenshots` 버킷
- SQL 마이그레이션 파일 (`supabase/migrations/`)
- Vitest 테스트 스위트 (unit tests)

### Definition of Done
- [ ] `bun run build` → `.output/chrome-mv3/manifest.json` 존재
- [ ] `bun test --run` → 모든 테스트 통과
- [ ] `bun run typecheck` → TypeScript 에러 0개
- [ ] Supabase `layouts` 테이블에 INSERT + SELECT + DELETE 동작 확인
- [ ] Supabase Storage `screenshots` 버킷에 이미지 업로드 동작 확인

### Must Have
- URL + title + description + OG tags + favicon URL 수집
- `captureVisibleTab`으로 viewport 스크린샷 캡처 (JPEG q80)
- 2축 카테고리 선택 (page_purpose + layout_type)
- Popup에서 빠른 저장
- Side Panel에서 갤러리 조회 + 필터 + 검색 + 삭제
- 에러 핸들링 (restricted URL, 네트워크 실패)
- TDD (Vitest + WxtVitest plugin)

### Must NOT Have (Guardrails)
- ❌ AI 분류 로직 (nullable `ai_category` 컬럼만, 실제 AI 호출 없음)
- ❌ 사용자 인증 / per-user 추적
- ❌ Full-page 스크린샷 (viewport only)
- ❌ 카테고리 CRUD UI (하드코딩된 TypeScript const 배열)
- ❌ Realtime 구독, Edge Functions, Supabase Auth 모듈
- ❌ 메타데이터 추출 범위 초과 (color palette, font stack, CSS framework 감지 등)
- ❌ 내보내기, 공유, 벌크 작업, 드래그앤드롭
- ❌ 다크모드 토글, 애니메이션, 온보딩 위자드
- ❌ Firefox/Safari 지원 (Chrome only)
- ❌ E2E 테스트 (Vitest unit test만)

---

## Verification Strategy

> **UNIVERSAL RULE: ZERO HUMAN INTERVENTION**
>
> ALL tasks in this plan MUST be verifiable WITHOUT any human action.
> FORBIDDEN: "User manually loads extension", "User visually confirms", "User interacts with"
> ALL verification is executed by the agent using tools.

### Test Decision
- **Infrastructure exists**: NO (빈 레포)
- **Automated tests**: TDD (RED-GREEN-REFACTOR)
- **Framework**: Vitest + WxtVitest() plugin + fakeBrowser

### TDD Workflow (per task)

Each TODO follows RED-GREEN-REFACTOR:

1. **RED**: Write failing test first
   - Test command: `bun test [file]`
   - Expected: FAIL
2. **GREEN**: Implement minimum code to pass
   - Command: `bun test [file]`
   - Expected: PASS
3. **REFACTOR**: Clean up while keeping green
   - Command: `bun test [file]`
   - Expected: PASS (still)

### Agent-Executed QA Scenarios (MANDATORY — ALL tasks)

**Verification Tool by Deliverable Type:**

| Type | Tool | How Agent Verifies |
|------|------|-------------------|
| **Extension Build** | Bash | `bun run build`, check manifest.json |
| **TypeScript** | Bash | `bun run typecheck` |
| **Unit Tests** | Bash | `bun test --run` |
| **Supabase Schema** | Bash (Supabase MCP or psql) | Query `information_schema.columns` |
| **Extension UI** | Playwright (playwright skill) | Load extension, interact, assert |

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately):
├── Task 1: Project Scaffolding (WXT + React + TS + Tailwind + shadcn/ui + Vitest)
└── Task 2: Supabase Schema + Storage Bucket

Wave 2 (After Wave 1):
└── Task 3: Supabase Client Data Layer (types, client init, service functions)

Wave 3 (After Task 3):
└── Task 4: Background Capture Logic (captureVisibleTab + content script + messaging)

Wave 4 (After Task 4):
└── Task 5: Popup UI (category selectors + save flow)

Wave 5 (After Task 5):
└── Task 6: Side Panel UI (gallery + filter + search + delete)
```

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
|------|------------|--------|---------------------|
| 1 | None | 3, 4, 5, 6 | 2 |
| 2 | None | 3 | 1 |
| 3 | 1, 2 | 4, 5, 6 | None |
| 4 | 3 | 5 | None |
| 5 | 4 | 6 | None |
| 6 | 5 | None | None |

### Agent Dispatch Summary

| Wave | Tasks | Recommended Dispatch |
|------|-------|---------------------|
| 1 | 1, 2 | Parallel: `task(category="quick", ...)` × 2 |
| 2 | 3 | Sequential: `task(category="unspecified-high", ...)` |
| 3 | 4 | Sequential: `task(category="unspecified-high", ...)` |
| 4 | 5 | Sequential: `task(category="visual-engineering", ...)` |
| 5 | 6 | Sequential: `task(category="visual-engineering", ...)` |

---

## TODOs

- [x] 1. Project Scaffolding — WXT + React + TypeScript + Tailwind + shadcn/ui + Vitest

  **What to do**:
  - `bun create wxt@latest` 로 WXT 프로젝트 초기화 (React + TypeScript 템플릿)
  - Tailwind CSS 4 설정 (PostCSS)
  - shadcn/ui 설치 및 초기 설정 (`components.json`, 기본 컴포넌트)
  - Vitest + `WxtVitest()` plugin 설정
  - `fakeBrowser` mock 설정
  - `bun run typecheck` 스크립트 추가 (`tsc --noEmit`)
  - `.env.example` 생성 (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`)
  - 카테고리 상수 정의 (`src/constants/categories.ts`):
    ```typescript
    export const PAGE_PURPOSES = [
      'Landing', 'Dashboard', 'E-commerce', 'Blog/Content',
      'Portfolio', 'SaaS App', 'Documentation', 'Social/Community'
    ] as const;
    export const LAYOUT_TYPES = [
      'Hero+CTA', 'Card Grid', 'Sidebar+Content', 'Full-width Scroll',
      'Split Screen', 'Data Table', 'Masonry', 'F-Pattern'
    ] as const;
    ```
  - 초기 디렉토리 구조:
    ```
    entrypoints/
      popup/index.html, main.tsx, App.tsx
      sidepanel/index.html, main.tsx, App.tsx
      background.ts
      content.ts
    src/
      constants/categories.ts
      lib/supabase.ts
      services/layout-service.ts
      types/layout.ts
      components/ui/  (shadcn)
    supabase/
      migrations/
    ```
  - 샘플 테스트 작성하여 Vitest 동작 확인

  **Must NOT do**:
  - 실제 기능 구현 (빈 entrypoint 파일만)
  - AI 관련 패키지 설치
  - E2E 테스트 프레임워크 설치

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 프레임워크 초기 설정은 공식 가이드를 따르는 단순 작업
  - **Skills**: [`frontend-ui-ux`]
    - `frontend-ui-ux`: Tailwind + shadcn/ui 설정 경험
  - **Skills Evaluated but Omitted**:
    - `playwright`: 이 태스크에서는 브라우저 테스트 불필요

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Task 2)
  - **Blocks**: Tasks 3, 4, 5, 6
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - (없음 — 빈 레포이므로 WXT 공식 가이드 참조)

  **External References**:
  - WXT 공식 문서: https://wxt.dev/guide/installation.html — 프로젝트 생성 및 구조
  - WXT React 가이드: https://wxt.dev/guide/react.html — React entrypoint 설정
  - WXT Testing 가이드: https://wxt.dev/guide/testing.html — Vitest + WxtVitest() + fakeBrowser
  - shadcn/ui 설치: https://ui.shadcn.com/docs/installation/vite — Vite 기반 프로젝트 설정
  - Tailwind CSS v4: https://tailwindcss.com/docs/installation/vite — Vite 통합

  **WHY Each Reference Matters**:
  - WXT 공식 가이드: file-based entrypoint 규칙, `main()` 함수 패턴, manifest 자동 생성을 정확히 따라야 함
  - WXT Testing: `WxtVitest()` 플러그인이 extension API를 mock하는 방식 이해 필수
  - shadcn/ui: WXT의 Vite 환경에서 component 설치 시 path alias 설정 확인 필요

  **Acceptance Criteria**:

  **Vitest Tests:**
  - [ ] `bun test --run` → 최소 1개 테스트 PASS
  - [ ] 카테고리 상수 테스트: `PAGE_PURPOSES` 길이 8, `LAYOUT_TYPES` 길이 8

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: WXT project builds successfully
    Tool: Bash
    Preconditions: None
    Steps:
      1. bun run build
      2. Assert: exit code 0
      3. Assert: file exists .output/chrome-mv3/manifest.json
      4. Assert: manifest.json contains "manifest_version": 3
      5. Assert: manifest.json contains "side_panel" key
    Expected Result: Clean build with valid MV3 manifest
    Evidence: Build output captured

  Scenario: TypeScript compiles without errors
    Tool: Bash
    Preconditions: Project scaffolded
    Steps:
      1. bun run typecheck
      2. Assert: exit code 0
      3. Assert: no "error TS" in output
    Expected Result: Zero TypeScript errors
    Evidence: Typecheck output captured

  Scenario: Vitest runs with WxtVitest plugin
    Tool: Bash
    Preconditions: Vitest configured with WxtVitest()
    Steps:
      1. bun test --run
      2. Assert: exit code 0
      3. Assert: output contains "Tests" and "passed"
    Expected Result: Test suite passes
    Evidence: Test output captured

  Scenario: shadcn/ui component renders
    Tool: Bash
    Preconditions: shadcn/ui configured
    Steps:
      1. Assert: file exists src/components/ui/button.tsx
      2. bun run typecheck
      3. Assert: exit code 0
    Expected Result: shadcn button component type-checks
    Evidence: Typecheck output captured
  ```

  **Commit**: YES
  - Message: `feat(scaffold): initialize WXT project with React, Tailwind, shadcn/ui, and Vitest`
  - Files: `package.json, wxt.config.ts, tsconfig.json, tailwind.config.*, vitest.config.ts, entrypoints/**, src/**, .env.example`
  - Pre-commit: `bun test --run && bun run typecheck`

---

- [x] 2. Supabase Schema + Storage Bucket

  **What to do**:
  - SQL 마이그레이션 파일 생성: `supabase/migrations/001_create_layouts.sql`
  - `layouts` 테이블 스키마:
    ```sql
    CREATE TABLE layouts (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
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
      raw_metadata JSONB DEFAULT '{}'::jsonb,
      ai_category JSONB,  -- nullable, reserved for future AI classification
      created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
    );

    -- Indexes
    CREATE INDEX idx_layouts_page_purpose ON layouts(page_purpose);
    CREATE INDEX idx_layouts_layout_type ON layouts(layout_type);
    CREATE INDEX idx_layouts_created_at ON layouts(created_at DESC);
    CREATE INDEX idx_layouts_url ON layouts(url);

    -- Full-text search
    ALTER TABLE layouts ADD COLUMN search_vector tsvector
      GENERATED ALWAYS AS (
        to_tsvector('english', COALESCE(title, '') || ' ' || COALESCE(description, '') || ' ' || COALESCE(url, ''))
      ) STORED;
    CREATE INDEX idx_layouts_search ON layouts USING GIN(search_vector);
    ```
  - RLS 정책 설정 (유저 결정에 따라):
    ```sql
    ALTER TABLE layouts ENABLE ROW LEVEL SECURITY;
    -- Permissive anon policies (소규모 내부 팀용)
    CREATE POLICY "anon_select" ON layouts FOR SELECT TO anon USING (true);
    CREATE POLICY "anon_insert" ON layouts FOR INSERT TO anon WITH CHECK (true);
    CREATE POLICY "anon_delete" ON layouts FOR DELETE TO anon USING (true);
    ```
  - Supabase Storage `screenshots` 버킷 생성 (public read)
  - 마이그레이션을 Supabase 프로젝트에 적용

  **Must NOT do**:
  - Stored procedures, triggers, functions
  - Realtime 활성화
  - Auth 관련 테이블이나 정책
  - `UNIQUE` constraint on `url` (중복 허용)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: SQL 스키마 생성은 명확한 사양을 따르는 단순 작업
  - **Skills**: []
    - DB 스키마 작성에 특별한 스킬 불필요
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: DB 작업과 무관

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Task 1)
  - **Blocks**: Task 3
  - **Blocked By**: None

  **References**:

  **External References**:
  - Supabase Storage 가이드: https://supabase.com/docs/guides/storage — 버킷 생성 및 정책
  - Supabase RLS 가이드: https://supabase.com/docs/guides/database/postgres/row-level-security — 정책 설정
  - PostgreSQL tsvector: https://www.postgresql.org/docs/current/textsearch-controls.html — full-text search

  **WHY Each Reference Matters**:
  - Storage 가이드: public 버킷 설정 방법, 파일 업로드 URL 구조 이해 필요
  - RLS 가이드: `anon` role에 대한 permissive 정책 작성 패턴
  - tsvector: generated column 문법과 GIN 인덱스 설정

  **Acceptance Criteria**:

  **Schema Validation:**
  - [ ] SQL 마이그레이션 파일 존재: `supabase/migrations/001_create_layouts.sql`
  - [ ] SQL 문법 오류 없음 (Supabase에 적용 성공)

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: layouts 테이블 스키마 검증
    Tool: Bash (Supabase MCP or psql)
    Preconditions: Supabase 프로젝트 접근 가능
    Steps:
      1. SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'layouts' ORDER BY ordinal_position;
      2. Assert: id (uuid, NO), url (text, NO), title (text, YES), description (text, YES)
      3. Assert: page_purpose (text, NO), layout_type (text, NO)
      4. Assert: ai_category (jsonb, YES), raw_metadata (jsonb, YES)
      5. Assert: screenshot_path (text, YES), created_at (timestamptz, NO)
      6. Assert: search_vector (tsvector, YES)
    Expected Result: 모든 컬럼이 명세와 일치
    Evidence: Query output captured

  Scenario: RLS 정책 활성화 확인
    Tool: Bash (Supabase MCP or psql)
    Preconditions: 마이그레이션 적용 완료
    Steps:
      1. SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'layouts';
      2. Assert: rowsecurity = true
      3. SELECT policyname, cmd FROM pg_policies WHERE tablename = 'layouts';
      4. Assert: anon_select (SELECT), anon_insert (INSERT), anon_delete (DELETE) 존재
    Expected Result: RLS 활성화 + 3개 정책 존재
    Evidence: Query output captured

  Scenario: Storage 버킷 존재 확인
    Tool: Bash (Supabase MCP or curl)
    Preconditions: Supabase 프로젝트 접근 가능
    Steps:
      1. Supabase Storage API로 버킷 목록 조회
      2. Assert: "screenshots" 버킷 존재
      3. Assert: public read 설정
    Expected Result: screenshots 버킷이 public으로 존재
    Evidence: API response captured

  Scenario: 데이터 INSERT + SELECT 동작 확인
    Tool: Bash (curl → Supabase REST API)
    Preconditions: 테이블 + RLS 정책 적용
    Steps:
      1. POST /rest/v1/layouts with {"url":"https://test.com","title":"Test","page_purpose":"Landing","layout_type":"Hero+CTA"}
      2. Assert: HTTP 201
      3. GET /rest/v1/layouts?url=eq.https://test.com
      4. Assert: HTTP 200, response array length >= 1
      5. DELETE /rest/v1/layouts?url=eq.https://test.com
      6. Assert: HTTP 200
    Expected Result: CRUD 동작 확인
    Evidence: Response bodies captured
  ```

  **Commit**: YES
  - Message: `feat(db): add Supabase schema with layouts table, RLS policies, and screenshots bucket`
  - Files: `supabase/migrations/001_create_layouts.sql`
  - Pre-commit: SQL 문법 검증

---

- [ ] 3. Supabase Client Data Layer — Types, Client Init, Service Functions

  **What to do**:
  - TypeScript 타입 정의 (`src/types/layout.ts`):
    ```typescript
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
      raw_metadata: Record<string, unknown>;
      ai_category: Record<string, unknown> | null;
      created_at: string;
    }
    export type PagePurpose = typeof PAGE_PURPOSES[number];
    export type LayoutType = typeof LAYOUT_TYPES[number];
    export interface LayoutInsert {
      url: string;
      title?: string;
      description?: string;
      og_image?: string;
      og_title?: string;
      og_description?: string;
      og_type?: string;
      favicon_url?: string;
      screenshot_path?: string;
      page_purpose: PagePurpose;
      layout_type: LayoutType;
      raw_metadata?: Record<string, unknown>;
    }
    ```
  - Supabase 클라이언트 초기화 (`src/lib/supabase.ts`):
    - Popup/Side Panel용: 일반 클라이언트 (브라우저 환경)
    - Background (Service Worker)용: `persistSession: false`, `autoRefreshToken: false`, `detectSessionInUrl: false`
    - `import.meta.env.VITE_SUPABASE_URL`, `import.meta.env.VITE_SUPABASE_ANON_KEY` 사용
  - 서비스 함수 (`src/services/layout-service.ts`):
    - `insertLayout(data: LayoutInsert): Promise<Layout>` — DB에 레코드 삽입
    - `uploadScreenshot(dataUrl: string, layoutId: string): Promise<string>` — data URL → Blob 변환 → Storage 업로드 → path 반환
    - `updateScreenshotPath(layoutId: string, path: string): Promise<void>` — 스크린샷 경로 업데이트
    - `getLayouts(filters?: { page_purpose?: string; layout_type?: string; search?: string }, page?: number): Promise<Layout[]>` — 필터/검색/페이지네이션 조회 (limit 20)
    - `deleteLayout(id: string, screenshotPath?: string): Promise<void>` — DB 삭제 + Storage 파일 삭제
    - `getScreenshotUrl(path: string): string` — Storage public URL 생성
  - **TDD**: 모든 서비스 함수에 대한 단위 테스트 (Supabase 클라이언트 mock)

  **Must NOT do**:
  - AI 분류 서비스 함수
  - Realtime subscription
  - 복잡한 캐싱 레이어
  - 서비스 함수 외의 비즈니스 로직

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: 타입 설계 + 서비스 레이어 + TDD는 신중한 설계 필요
  - **Skills**: []
    - Supabase JS 클라이언트는 잘 알려진 라이브러리, 특별한 스킬 불필요
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: 데이터 레이어는 UI 작업 아님

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 2 (Sequential)
  - **Blocks**: Tasks 4, 5, 6
  - **Blocked By**: Tasks 1, 2

  **References**:

  **Pattern References**:
  - `src/constants/categories.ts` (Task 1에서 생성) — `PAGE_PURPOSES`, `LAYOUT_TYPES` 상수
  - `supabase/migrations/001_create_layouts.sql` (Task 2에서 생성) — 컬럼명과 타입 매핑

  **External References**:
  - Supabase JS Client: https://supabase.com/docs/reference/javascript/introduction — `createClient`, `from`, `storage`
  - Supabase Storage JS: https://supabase.com/docs/reference/javascript/storage-from-upload — upload 메서드
  - WXT env variables: https://wxt.dev/guide/configuration.html#environment-variables — `import.meta.env` 사용법

  **WHY Each Reference Matters**:
  - Supabase JS Client: `from('layouts').insert()`, `.select()`, `.delete()` 등의 정확한 API 시그니처
  - Storage JS: data URL → Blob → `upload()` 체인의 정확한 파라미터
  - WXT env: Vite 환경에서 `VITE_` prefix 규칙, service worker에서의 접근 방식

  **Acceptance Criteria**:

  **Vitest Tests (TDD):**
  - [ ] `bun test src/services/layout-service.test.ts` → PASS
  - [ ] 테스트 커버리지: `insertLayout`, `uploadScreenshot`, `getLayouts`, `deleteLayout`, `getScreenshotUrl`
  - [ ] mock된 Supabase 클라이언트로 각 함수의 성공/실패 경로 테스트
  - [ ] data URL → Blob 변환 로직 테스트

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: insertLayout 성공 테스트
    Tool: Bash (bun test)
    Preconditions: Vitest + mock 설정 완료
    Steps:
      1. bun test src/services/layout-service.test.ts --grep "insertLayout"
      2. Assert: exit code 0
      3. Assert: output shows "insertLayout" tests passed
    Expected Result: insert 함수가 올바른 데이터로 Supabase .insert() 호출
    Evidence: Test output captured

  Scenario: uploadScreenshot data URL to Blob 변환
    Tool: Bash (bun test)
    Preconditions: Vitest 설정 완료
    Steps:
      1. bun test src/services/layout-service.test.ts --grep "uploadScreenshot"
      2. Assert: exit code 0
      3. Assert: Supabase storage.upload 호출 시 Blob 타입 + JPEG content-type
      4. Assert: filename이 UUID 형식 ({layoutId}.jpg)
    Expected Result: data URL이 올바르게 Blob으로 변환되어 업로드
    Evidence: Test output captured

  Scenario: getLayouts 페이지네이션 동작
    Tool: Bash (bun test)
    Preconditions: Vitest 설정 완료
    Steps:
      1. bun test src/services/layout-service.test.ts --grep "getLayouts"
      2. Assert: .range(0, 19) 호출 확인 (page 1)
      3. Assert: .range(20, 39) 호출 확인 (page 2)
      4. Assert: filter 파라미터가 .eq() 호출로 변환
    Expected Result: 올바른 range와 filter로 Supabase 쿼리
    Evidence: Test output captured

  Scenario: deleteLayout DB + Storage 삭제
    Tool: Bash (bun test)
    Preconditions: Vitest 설정 완료
    Steps:
      1. bun test src/services/layout-service.test.ts --grep "deleteLayout"
      2. Assert: supabase.from('layouts').delete().eq('id', ...) 호출
      3. Assert: supabase.storage.from('screenshots').remove([path]) 호출
    Expected Result: DB 레코드와 Storage 파일 모두 삭제
    Evidence: Test output captured

  Scenario: TypeScript 타입 체크
    Tool: Bash
    Preconditions: 타입 정의 완료
    Steps:
      1. bun run typecheck
      2. Assert: exit code 0
    Expected Result: 모든 타입이 올바르게 정의됨
    Evidence: Typecheck output captured
  ```

  **Commit**: YES
  - Message: `feat(data): add Supabase client, types, and layout service with TDD tests`
  - Files: `src/types/layout.ts, src/lib/supabase.ts, src/services/layout-service.ts, src/services/layout-service.test.ts`
  - Pre-commit: `bun test --run && bun run typecheck`

---

- [ ] 4. Background Capture Logic — captureVisibleTab + Content Script + Messaging

  **What to do**:
  - Content Script (`entrypoints/content.ts`):
    - `main()` 내부에서 메시지 리스너 등록
    - `extract-metadata` 메시지 수신 시:
      - `document.title`
      - `<meta name="description">`
      - `<meta property="og:image/title/description/type">`
      - `<link rel="icon">` (favicon URL)
    - 추출된 메타데이터를 응답으로 반환
  - Background Script (`entrypoints/background.ts`):
    - `defineBackground` + `main()` 패턴
    - 메시지 리스너:
      - `capture-tab` 메시지 수신 → `chrome.tabs.captureVisibleTab(null, { format: 'jpeg', quality: 80 })`
      - 결과 (data URL)를 응답으로 반환
    - URL 검증 함수: `chrome://`, `about:`, `chrome-extension://`, `data:` 등 restricted URL 감지
  - Popup → Background 메시징 유틸 (`src/lib/messaging.ts`):
    - `captureCurrentTab(): Promise<string>` — background에 캡처 요청 → data URL 반환
    - `extractMetadata(tabId: number): Promise<Metadata>` — content script에 메타데이터 추출 요청
    - `isRestrictedUrl(url: string): boolean` — 캡처 불가능 URL 검사
  - **TDD**: fakeBrowser로 chrome.tabs.captureVisibleTab, browser.runtime.sendMessage 등 mock

  **Must NOT do**:
  - Full-page 스크린샷 (scroll+stitch)
  - DOM 수정이나 UI 주입
  - `activeTab` 외 추가 permissions
  - SPA 감지나 `wxt:locationchange` (MVP 불필요)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Chrome Extension API + 메시징 패턴은 정확한 API 이해 필요
  - **Skills**: []
    - Chrome Extension API는 잘 문서화됨, 특별한 스킬 불필요
  - **Skills Evaluated but Omitted**:
    - `playwright`: 이 태스크에서는 extension 로딩 불필요, unit test로 충분

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 3 (Sequential)
  - **Blocks**: Task 5
  - **Blocked By**: Task 3

  **References**:

  **Pattern References**:
  - `src/services/layout-service.ts` (Task 3) — `uploadScreenshot()` 함수 시그니처
  - `src/types/layout.ts` (Task 3) — `LayoutInsert` 타입의 메타데이터 필드

  **External References**:
  - WXT Entrypoints: https://wxt.dev/guide/entrypoints.html — `defineBackground`, `defineContentScript`
  - WXT Messaging: https://wxt.dev/guide/messaging.html — 확장 내 메시징 패턴
  - Chrome captureVisibleTab: https://developer.chrome.com/docs/extensions/reference/api/tabs#method-captureVisibleTab
  - WXT Testing + fakeBrowser: https://wxt.dev/guide/testing.html — extension API mock

  **WHY Each Reference Matters**:
  - WXT Entrypoints: `main()` 함수 안에 코드를 넣어야 하는 규칙, 밖에 두면 빌드 시 크래시
  - Chrome captureVisibleTab: format, quality 옵션과 반환값(data URL) 확인
  - WXT Messaging: `defineExtensionMessaging` 패턴이 있으면 type-safe 메시징 가능

  **Acceptance Criteria**:

  **Vitest Tests (TDD):**
  - [ ] `bun test entrypoints/content.test.ts` → PASS
  - [ ] `bun test entrypoints/background.test.ts` → PASS
  - [ ] `bun test src/lib/messaging.test.ts` → PASS
  - [ ] `isRestrictedUrl("chrome://extensions")` → `true`
  - [ ] `isRestrictedUrl("https://google.com")` → `false`
  - [ ] `captureVisibleTab` mock이 JPEG data URL 반환
  - [ ] Content Script가 OG tags 정확히 추출

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: Restricted URL 감지
    Tool: Bash (bun test)
    Preconditions: messaging 유틸 작성 완료
    Steps:
      1. bun test src/lib/messaging.test.ts --grep "isRestrictedUrl"
      2. Assert: chrome:// → true
      3. Assert: chrome-extension:// → true
      4. Assert: about: → true
      5. Assert: data: → true
      6. Assert: https://example.com → false
      7. Assert: http://localhost:3000 → false
    Expected Result: 모든 restricted URL 패턴 정확히 감지
    Evidence: Test output captured

  Scenario: Content Script 메타데이터 추출
    Tool: Bash (bun test)
    Preconditions: fakeBrowser 설정 + DOM mock
    Steps:
      1. bun test entrypoints/content.test.ts --grep "extract-metadata"
      2. Assert: title 추출 확인
      3. Assert: meta description 추출 확인
      4. Assert: og:image, og:title, og:description, og:type 추출 확인
      5. Assert: favicon URL 추출 확인
      6. Assert: OG tag 없는 페이지에서 null 반환
    Expected Result: 모든 메타데이터 필드 정확히 추출
    Evidence: Test output captured

  Scenario: Background captureVisibleTab 호출
    Tool: Bash (bun test)
    Preconditions: fakeBrowser 설정
    Steps:
      1. bun test entrypoints/background.test.ts --grep "capture-tab"
      2. Assert: chrome.tabs.captureVisibleTab(null, {format:'jpeg', quality:80}) 호출
      3. Assert: data URL 형식 응답 반환
    Expected Result: 올바른 옵션으로 캡처 API 호출
    Evidence: Test output captured

  Scenario: 빌드 후 manifest 확인
    Tool: Bash
    Preconditions: 모든 entrypoint 작성 완료
    Steps:
      1. bun run build
      2. Assert: .output/chrome-mv3/manifest.json 존재
      3. Assert: manifest에 "content_scripts" 섹션 존재
      4. Assert: manifest에 "background" 섹션 존재
      5. Assert: permissions에 "activeTab" 포함
    Expected Result: manifest에 모든 entrypoint 반영
    Evidence: manifest.json 내용 captured
  ```

  **Commit**: YES
  - Message: `feat(capture): add background screenshot capture, content script metadata extraction, and messaging layer`
  - Files: `entrypoints/background.ts, entrypoints/content.ts, src/lib/messaging.ts, *.test.ts`
  - Pre-commit: `bun test --run && bun run typecheck`

---

- [ ] 5. Popup UI — Category Selectors + Save Flow + Error States

  **What to do**:
  - Popup 레이아웃 (`entrypoints/popup/App.tsx`):
    - 현재 탭 URL + title 표시 (읽기 전용)
    - 스크린샷 미리보기 (data URL → img 태그)
    - **page_purpose** 드롭다운 (shadcn Select 컴포넌트)
    - **layout_type** 드롭다운 (shadcn Select 컴포넌트)
    - 메모 입력 필드 (선택사항, 짧은 텍스트)
    - **Save** 버튼 (shadcn Button)
  - 저장 흐름:
    1. Popup open → `extractMetadata(tabId)` + `captureCurrentTab()` 동시 호출
    2. Restricted URL이면 → 에러 메시지 표시, 저장 버튼 비활성화
    3. 사용자가 카테고리 선택 + Save 클릭
    4. Save 버튼 disabled (중복 클릭 방지)
    5. `insertLayout()` → DB 저장
    6. `uploadScreenshot()` → Storage 업로드
    7. `updateScreenshotPath()` → 경로 업데이트
    8. 성공 → 성공 토스트 + 2초 후 popup 닫기
    9. 실패 → 에러 토스트 + Save 버튼 재활성화
  - Popup 크기: `width: 380px`, `min-height: 480px` (manifest 또는 CSS)
  - shadcn 컴포넌트 사용: `Button`, `Select`, `Input`, `Label`, 토스트(`Sonner` 또는 간단한 상태 메시지)

  **Must NOT do**:
  - AI 분류 UI (자동 분류 버튼 등)
  - 태그 자유 입력
  - 카테고리 커스터마이징 UI
  - 다크모드
  - 온보딩 화면

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Popup UI 구현은 프론트엔드 + UX 작업
  - **Skills**: [`frontend-ui-ux`]
    - `frontend-ui-ux`: shadcn/ui + Tailwind 조합으로 깔끔한 Popup UI 구현
  - **Skills Evaluated but Omitted**:
    - `playwright`: Popup은 extension context라 Playwright 접근 제한적, unit test 우선

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 4 (Sequential)
  - **Blocks**: Task 6
  - **Blocked By**: Task 4

  **References**:

  **Pattern References**:
  - `src/services/layout-service.ts` (Task 3) — `insertLayout()`, `uploadScreenshot()`, `updateScreenshotPath()`
  - `src/lib/messaging.ts` (Task 4) — `captureCurrentTab()`, `extractMetadata()`, `isRestrictedUrl()`
  - `src/constants/categories.ts` (Task 1) — `PAGE_PURPOSES`, `LAYOUT_TYPES` 배열
  - `src/types/layout.ts` (Task 3) — `LayoutInsert` 타입

  **External References**:
  - shadcn/ui Select: https://ui.shadcn.com/docs/components/select — 드롭다운 컴포넌트 사용법
  - shadcn/ui Button: https://ui.shadcn.com/docs/components/button — 버튼 variants, loading state
  - WXT Popup: https://wxt.dev/guide/entrypoints/popup.html — Popup entrypoint 규칙

  **WHY Each Reference Matters**:
  - shadcn Select: controlled 컴포넌트 패턴, `onValueChange` 핸들러 사용법
  - WXT Popup: popup HTML 파일 구조, 크기 설정 방법, React 마운트 패턴

  **Acceptance Criteria**:

  **Vitest Tests (TDD):**
  - [ ] `bun test entrypoints/popup/App.test.tsx` → PASS
  - [ ] Popup이 현재 탭 URL과 title 표시
  - [ ] 카테고리 미선택 시 Save 버튼 disabled
  - [ ] Save 클릭 시 `insertLayout` + `uploadScreenshot` 호출
  - [ ] Save 중 버튼 disabled (loading 상태)
  - [ ] 성공 시 성공 메시지 표시
  - [ ] 실패 시 에러 메시지 표시 + 버튼 재활성화
  - [ ] Restricted URL 시 에러 표시 + Save 비활성화

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: Popup 렌더링 및 카테고리 선택
    Tool: Bash (bun test)
    Preconditions: Popup 컴포넌트 구현 완료
    Steps:
      1. bun test entrypoints/popup/App.test.tsx --grep "renders"
      2. Assert: URL 텍스트 표시
      3. Assert: page_purpose Select 존재
      4. Assert: layout_type Select 존재
      5. Assert: Save 버튼 존재 (initially disabled)
    Expected Result: Popup UI 요소 모두 렌더링
    Evidence: Test output captured

  Scenario: Save 흐름 성공 경로
    Tool: Bash (bun test)
    Preconditions: 서비스 함수 mock 완료
    Steps:
      1. bun test entrypoints/popup/App.test.tsx --grep "save success"
      2. Assert: insertLayout 호출 with correct page_purpose, layout_type
      3. Assert: uploadScreenshot 호출 with data URL
      4. Assert: 성공 메시지 표시
    Expected Result: 저장 체인 (insert → upload → update path) 정상 동작
    Evidence: Test output captured

  Scenario: 네트워크 실패 시 에러 표시
    Tool: Bash (bun test)
    Preconditions: insertLayout mock이 에러 throw
    Steps:
      1. bun test entrypoints/popup/App.test.tsx --grep "network error"
      2. Assert: 에러 메시지 표시
      3. Assert: Save 버튼 다시 활성화
    Expected Result: 사용자에게 에러 피드백 + 재시도 가능
    Evidence: Test output captured

  Scenario: Restricted URL 처리
    Tool: Bash (bun test)
    Preconditions: isRestrictedUrl mock 반환 true
    Steps:
      1. bun test entrypoints/popup/App.test.tsx --grep "restricted"
      2. Assert: "Cannot capture this page" 메시지 표시
      3. Assert: Save 버튼 disabled
      4. Assert: 스크린샷 미리보기 없음
    Expected Result: Restricted URL에서 적절한 UX
    Evidence: Test output captured

  Scenario: 빌드 검증
    Tool: Bash
    Preconditions: Popup 구현 완료
    Steps:
      1. bun run build
      2. Assert: .output/chrome-mv3/popup.html 존재
      3. bun run typecheck
      4. Assert: exit code 0
    Expected Result: Popup이 빌드에 포함
    Evidence: Build output captured
  ```

  **Commit**: YES
  - Message: `feat(popup): add layout capture popup with category selection and save flow`
  - Files: `entrypoints/popup/App.tsx, entrypoints/popup/App.test.tsx, entrypoints/popup/main.tsx, entrypoints/popup/index.html`
  - Pre-commit: `bun test --run && bun run typecheck`

---

- [ ] 6. Side Panel UI — Gallery Grid + Filter + Search + Delete

  **What to do**:
  - Side Panel 레이아웃 (`entrypoints/sidepanel/App.tsx`):
    - 상단: 필터바 (page_purpose 드롭다운 + layout_type 드롭다운 + 텍스트 검색 Input)
    - 메인: 카드 그리드 (스크린샷 썸네일 + title + URL + 카테고리 뱃지)
    - 카드 클릭 → 새 탭에서 URL 열기
    - 카드에 삭제 버튼 (확인 다이얼로그 후 삭제)
    - 빈 상태: "No layouts saved yet" 메시지
    - 무한 스크롤 (또는 "Load More" 버튼) — `getLayouts(filters, page)` 호출
  - 필터링:
    - page_purpose 드롭다운 (전체 + 8개 카테고리)
    - layout_type 드롭다운 (전체 + 8개 카테고리)
    - 텍스트 검색: debounce 300ms, `search_vector` 활용
    - 필터 변경 시 결과 리셋 + 1페이지부터 다시 로드
  - shadcn 컴포넌트: `Card`, `Select`, `Input`, `Button`, `Badge`, `AlertDialog`
  - 스크린샷 URL: `getScreenshotUrl(screenshot_path)` 로 public URL 생성

  **Must NOT do**:
  - 정렬 (created_at DESC 고정)
  - 그룹핑, 타임라인, 비교, 라이트박스
  - 인라인 편집
  - 드래그앤드롭
  - 벌크 작업 (일괄 삭제 등)
  - 내보내기 (CSV, JSON)

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: 갤러리 UI + 필터링 UX는 프론트엔드 중심 작업
  - **Skills**: [`frontend-ui-ux`]
    - `frontend-ui-ux`: 카드 그리드 + 필터 UX + shadcn 조합
  - **Skills Evaluated but Omitted**:
    - `playwright`: Side Panel도 extension context, unit test 우선

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 5 (Sequential, final)
  - **Blocks**: None
  - **Blocked By**: Task 5

  **References**:

  **Pattern References**:
  - `entrypoints/popup/App.tsx` (Task 5) — shadcn Select 사용 패턴, React 상태 관리 패턴
  - `src/services/layout-service.ts` (Task 3) — `getLayouts()`, `deleteLayout()`, `getScreenshotUrl()`
  - `src/constants/categories.ts` (Task 1) — 필터 드롭다운 옵션
  - `src/types/layout.ts` (Task 3) — `Layout` 타입

  **External References**:
  - shadcn/ui Card: https://ui.shadcn.com/docs/components/card — 카드 컴포넌트
  - shadcn/ui AlertDialog: https://ui.shadcn.com/docs/components/alert-dialog — 삭제 확인
  - WXT Side Panel: https://wxt.dev/guide/entrypoints/side-panel.html — Side Panel entrypoint 규칙

  **WHY Each Reference Matters**:
  - shadcn Card: 이미지 + 텍스트 조합 카드 레이아웃 구조
  - AlertDialog: 삭제 확인 UX 패턴 (Cancel/Confirm)
  - WXT Side Panel: `chrome.sidePanel` API, open 방법, manifest 설정

  **Acceptance Criteria**:

  **Vitest Tests (TDD):**
  - [ ] `bun test entrypoints/sidepanel/App.test.tsx` → PASS
  - [ ] 갤러리가 `getLayouts()` 결과를 카드로 렌더링
  - [ ] 필터 변경 시 새 쿼리 호출
  - [ ] 텍스트 검색 debounce 동작
  - [ ] 삭제 버튼 → AlertDialog → 확인 → `deleteLayout()` 호출
  - [ ] 빈 상태 메시지 표시
  - [ ] 카드 클릭 시 `chrome.tabs.create({ url })` 호출
  - [ ] Load More / 무한 스크롤 동작

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: 갤러리 카드 렌더링
    Tool: Bash (bun test)
    Preconditions: getLayouts mock이 3개 Layout 반환
    Steps:
      1. bun test entrypoints/sidepanel/App.test.tsx --grep "renders gallery"
      2. Assert: 3개 카드 렌더링
      3. Assert: 각 카드에 title 텍스트 표시
      4. Assert: 각 카드에 스크린샷 img 태그 (src = public URL)
      5. Assert: 각 카드에 page_purpose + layout_type Badge
    Expected Result: 레이아웃 데이터가 카드 그리드로 표시
    Evidence: Test output captured

  Scenario: 필터링 동작
    Tool: Bash (bun test)
    Preconditions: getLayouts mock 설정
    Steps:
      1. bun test entrypoints/sidepanel/App.test.tsx --grep "filter"
      2. Assert: page_purpose 선택 시 getLayouts({page_purpose: "Landing"}) 호출
      3. Assert: layout_type 선택 시 getLayouts({layout_type: "Card Grid"}) 호출
      4. Assert: 두 필터 동시 적용 가능
    Expected Result: 필터가 쿼리 파라미터로 전달
    Evidence: Test output captured

  Scenario: 텍스트 검색 + debounce
    Tool: Bash (bun test)
    Preconditions: getLayouts mock 설정
    Steps:
      1. bun test entrypoints/sidepanel/App.test.tsx --grep "search"
      2. Assert: 입력 후 300ms 이내 getLayouts 호출 안 됨
      3. Assert: 300ms 후 getLayouts({search: "landing"}) 호출
    Expected Result: debounce가 불필요한 API 호출 방지
    Evidence: Test output captured

  Scenario: 레이아웃 삭제
    Tool: Bash (bun test)
    Preconditions: deleteLayout mock 설정
    Steps:
      1. bun test entrypoints/sidepanel/App.test.tsx --grep "delete"
      2. Assert: 삭제 버튼 클릭 → AlertDialog 표시
      3. Assert: Cancel 클릭 → deleteLayout 호출 안 됨
      4. Assert: Confirm 클릭 → deleteLayout(id, screenshot_path) 호출
      5. Assert: 삭제 후 해당 카드 제거
    Expected Result: 확인 후 삭제, UI 즉시 반영
    Evidence: Test output captured

  Scenario: 빈 상태
    Tool: Bash (bun test)
    Preconditions: getLayouts mock이 빈 배열 반환
    Steps:
      1. bun test entrypoints/sidepanel/App.test.tsx --grep "empty"
      2. Assert: "No layouts saved yet" 텍스트 표시
      3. Assert: 카드 없음
    Expected Result: 빈 상태 안내 메시지
    Evidence: Test output captured

  Scenario: 최종 빌드 검증
    Tool: Bash
    Preconditions: 모든 태스크 완료
    Steps:
      1. bun run build
      2. Assert: .output/chrome-mv3/manifest.json 존재
      3. Assert: manifest에 "side_panel" 키 존재
      4. bun test --run
      5. Assert: 모든 테스트 통과
      6. bun run typecheck
      7. Assert: exit code 0
    Expected Result: 전체 프로젝트 빌드 + 테스트 + 타입체크 통과
    Evidence: Build + test + typecheck output captured
  ```

  **Commit**: YES
  - Message: `feat(sidepanel): add layout gallery with filtering, search, and delete`
  - Files: `entrypoints/sidepanel/App.tsx, entrypoints/sidepanel/App.test.tsx, entrypoints/sidepanel/main.tsx, entrypoints/sidepanel/index.html`
  - Pre-commit: `bun test --run && bun run typecheck`

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 1 | `feat(scaffold): initialize WXT project with React, Tailwind, shadcn/ui, and Vitest` | package.json, wxt.config.ts, tsconfig.json, tailwind, vitest config, entrypoints/**, src/**, .env.example | `bun test --run && bun run typecheck` |
| 2 | `feat(db): add Supabase schema with layouts table, RLS policies, and screenshots bucket` | supabase/migrations/001_create_layouts.sql | SQL 적용 성공 |
| 3 | `feat(data): add Supabase client, types, and layout service with TDD tests` | src/types/layout.ts, src/lib/supabase.ts, src/services/layout-service.ts, *.test.ts | `bun test --run && bun run typecheck` |
| 4 | `feat(capture): add background screenshot capture, content script metadata extraction, and messaging layer` | entrypoints/background.ts, entrypoints/content.ts, src/lib/messaging.ts, *.test.ts | `bun test --run && bun run typecheck` |
| 5 | `feat(popup): add layout capture popup with category selection and save flow` | entrypoints/popup/**, *.test.tsx | `bun test --run && bun run typecheck` |
| 6 | `feat(sidepanel): add layout gallery with filtering, search, and delete` | entrypoints/sidepanel/**, *.test.tsx | `bun test --run && bun run typecheck` |

---

## Success Criteria

### Verification Commands
```bash
bun run build          # Expected: .output/chrome-mv3/manifest.json 존재
bun test --run         # Expected: 모든 테스트 통과
bun run typecheck      # Expected: 0 errors
```

### Final Checklist
- [ ] WXT 프로젝트 빌드 성공 (MV3 manifest 생성)
- [ ] Supabase layouts 테이블 + screenshots 버킷 존재
- [ ] Popup에서 URL + 메타데이터 + 스크린샷 + 카테고리 저장
- [ ] Side Panel에서 갤러리 조회 + 필터 + 검색 + 삭제
- [ ] Restricted URL 에러 처리
- [ ] 네트워크 실패 에러 처리
- [ ] 모든 Vitest 테스트 통과
- [ ] TypeScript 에러 0개
- [ ] AI 분류 로직 없음 (nullable 컬럼만)
- [ ] 인증 로직 없음
- [ ] Full-page 스크린샷 없음
