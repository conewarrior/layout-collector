#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

// --- Init Command ---

const AGENT_PROMPT = `# Layout Curator

당신은 디자인 레퍼런스 전문가입니다. 팀이 수집한 웹 레이아웃 레퍼런스 데이터베이스를 활용하여, UI/디자인 작업 시 관련 레퍼런스를 검색하고 분석한 뒤 구현에 반영합니다.

## 핵심 행동 규칙

**UI 또는 디자인 관련 요청을 받으면, 코드를 작성하기 전에 반드시 레퍼런스를 먼저 검색합니다.**

### 자동 검색 트리거

다음 키워드가 요청에 포함되면 MCP 도구로 레퍼런스를 검색합니다:
- 페이지/화면 만들기: "랜딩 페이지", "대시보드", "상품 목록", "블로그" 등
- 레이아웃 패턴: "카드 그리드", "사이드바", "히어로 섹션", "분할 화면" 등
- 디자인 참고: "레퍼런스", "참고할 만한", "비슷한 디자인", "레이아웃 추천" 등

### 검색 전략

1. **페이지 유형이 명확한 경우**: \`search_layouts(page_purpose: ...)\` 사용
   - "랜딩 페이지 만들어줘" → \`page_purpose: "Landing"\`
   - "대시보드 화면" → \`page_purpose: "Dashboard"\`
   - "쇼핑몰" → \`page_purpose: "E-commerce"\`

2. **레이아웃 패턴이 명확한 경우**: \`search_layouts(layout_type: ...)\` 사용
   - "카드 그리드로" → \`layout_type: "Card Grid"\`
   - "사이드바 있는" → \`layout_type: "Sidebar+Content"\`

3. **둘 다 있는 경우**: 두 필터를 함께 사용
   - "대시보드에 카드 그리드" → \`page_purpose: "Dashboard", layout_type: "Card Grid"\`

4. **키워드 검색**: \`search_layouts(query: ...)\` 사용
   - "cosmos 같은" → \`query: "cosmos"\`

5. **특정 URL 조회**: \`get_layout(url: ...)\` 사용

6. **카테고리 확인**: \`list_categories()\` 사용

### 검색 결과 활용

레퍼런스를 찾았으면:

1. **결과 요약**: 찾은 레퍼런스의 URL, 유형, 특징을 간단히 소개
2. **패턴 분석**: 레퍼런스들에서 공통적으로 사용하는 레이아웃 패턴 파악
3. **적용 제안**: 현재 작업에 어떤 패턴을 적용할지 제안
4. **구현 반영**: 승인 받은 패턴으로 코드 작성

레퍼런스가 없으면:
- "현재 수집된 레퍼런스 중 관련된 것이 없습니다"라고 알리고 진행

## 카테고리 참조

### 페이지 목적 (page_purpose)
| 값 | 설명 |
|---|---|
| Landing | 제품/서비스 소개, 가입/구매 유도 |
| Dashboard | 데이터/지표를 보여주는 관리 화면 |
| E-commerce | 상품 목록, 상세, 장바구니 |
| Blog/Content | 글, 뉴스, 아티클 등 읽기 중심 |
| Portfolio | 작업물/프로젝트 전시 |
| SaaS App | 에디터, 설정 등 실제 서비스 화면 |
| Documentation | API 문서, 튜토리얼, 레퍼런스 |
| Social/Community | 피드, 프로필, 게시판 |

### 레이아웃 유형 (layout_type)
| 값 | 설명 |
|---|---|
| Hero+CTA | 큰 비주얼 + 행동 유도 버튼 |
| Card Grid | 카드가 격자로 반복 배치 |
| Sidebar+Content | 사이드바 + 메인 콘텐츠 2단 구조 |
| Full-width Scroll | 전체 폭, 스크롤로 섹션 전환 |
| Split Screen | 좌우 또는 상하 반반 분할 |
| Data Table | 데이터 테이블/리스트가 핵심 |
| Masonry | 높이 다른 카드가 빈틈없이 채워지는 구성 |
| F-Pattern | 왼쪽에서 오른쪽, 위에서 아래 시선 흐름 |
`;

if (process.argv[2] === "init") {
  runInit();
  process.exit(0);
}

function runInit() {
  const cwd = process.cwd();

  // 1. Create .claude/agents/layout-curator.md
  const agentDir = path.join(cwd, ".claude", "agents");
  const agentFile = path.join(agentDir, "layout-curator.md");

  fs.mkdirSync(agentDir, { recursive: true });
  fs.writeFileSync(agentFile, AGENT_PROMPT);
  console.log(`✓ Created ${path.relative(cwd, agentFile)}`);

  // 2. Create/update .mcp.json
  const mcpFile = path.join(cwd, ".mcp.json");
  let mcpConfig: { mcpServers: Record<string, unknown> } = { mcpServers: {} };

  if (fs.existsSync(mcpFile)) {
    mcpConfig = JSON.parse(fs.readFileSync(mcpFile, "utf-8"));
    if (!mcpConfig.mcpServers) mcpConfig.mcpServers = {};
  }

  mcpConfig.mcpServers["layout-collector"] = {
    command: "npx",
    args: ["@gpters-internal/layout-collector-mcp"],
  };

  fs.writeFileSync(mcpFile, JSON.stringify(mcpConfig, null, 2) + "\n");
  console.log(`✓ Updated ${path.relative(cwd, mcpFile)}`);

  console.log("\nLayout Curator 설치 완료!");
  console.log("Claude Code에서 에이전트를 사용하려면:");
  console.log('  → "@layout-curator 랜딩 페이지 만들어줘"');
}

// --- Supabase ---

const SUPABASE_URL =
  process.env.SUPABASE_URL ||
  "https://ecxjzhriysblfwocoeuc.supabase.co";

const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVjeGp6aHJpeXNibGZ3b2NvZXVjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0NzE2MzQsImV4cCI6MjA4NzA0NzYzNH0.Ikf-J5UIUVKlcXhkukUfBlICHJxnm4kcMr3-nY_EPZo";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function screenshotUrl(path: string): string {
  return `${SUPABASE_URL}/storage/v1/object/public/screenshots/${path}`;
}

// --- Categories ---

const PAGE_PURPOSES = [
  "Landing",
  "Dashboard",
  "E-commerce",
  "Blog/Content",
  "Portfolio",
  "SaaS App",
  "Documentation",
  "Social/Community",
] as const;

const LAYOUT_TYPES = [
  "Hero+CTA",
  "Card Grid",
  "Sidebar+Content",
  "Full-width Scroll",
  "Split Screen",
  "Data Table",
  "Masonry",
  "F-Pattern",
] as const;

const PURPOSE_META: Record<string, { label: string; description: string }> = {
  Landing: { label: "랜딩 페이지", description: "제품/서비스 소개, 가입·구매 유도" },
  Dashboard: { label: "대시보드", description: "데이터·지표를 보여주는 관리 화면" },
  "E-commerce": { label: "쇼핑", description: "상품 목록, 상세, 장바구니" },
  "Blog/Content": { label: "블로그·콘텐츠", description: "글, 뉴스, 아티클 등 읽기 중심" },
  Portfolio: { label: "포트폴리오", description: "작업물·프로젝트 전시" },
  "SaaS App": { label: "SaaS 앱 화면", description: "에디터, 설정 등 실제 서비스 화면" },
  Documentation: { label: "문서·가이드", description: "API 문서, 튜토리얼, 레퍼런스" },
  "Social/Community": { label: "커뮤니티", description: "피드, 프로필, 게시판" },
};

const LAYOUT_META: Record<string, { label: string; description: string }> = {
  "Hero+CTA": { label: "히어로 섹션", description: "큰 비주얼 + 행동 유도 버튼" },
  "Card Grid": { label: "카드 그리드", description: "카드가 격자로 반복 배치" },
  "Sidebar+Content": { label: "사이드바 레이아웃", description: "사이드바 + 메인 콘텐츠 2단 구조" },
  "Full-width Scroll": { label: "풀스크롤", description: "전체 폭, 스크롤로 섹션 전환" },
  "Split Screen": { label: "분할 화면", description: "좌우 또는 상하 반반 분할" },
  "Data Table": { label: "테이블 중심", description: "데이터 테이블/리스트가 핵심" },
  Masonry: { label: "핀터레스트형", description: "높이 다른 카드가 빈틈없이 채워지는 구성" },
  "F-Pattern": { label: "F패턴", description: "왼쪽→오른쪽→아래 시선 흐름" },
};

// --- MCP Server ---

const server = new McpServer({
  name: "layout-collector",
  version: "1.0.0",
});

// Tool 1: search_layouts
server.tool(
  "search_layouts",
  "수집된 웹 레이아웃 레퍼런스를 검색합니다. 키워드, 페이지 목적, 레이아웃 유형으로 필터링할 수 있습니다.",
  {
    query: z.string().optional().describe("검색어 (제목, URL, 설명에서 검색)"),
    page_purpose: z
      .enum(PAGE_PURPOSES)
      .optional()
      .describe("페이지 목적 필터 (Landing, Dashboard, E-commerce, Blog/Content, Portfolio, SaaS App, Documentation, Social/Community)"),
    layout_type: z
      .enum(LAYOUT_TYPES)
      .optional()
      .describe("레이아웃 유형 필터 (Hero+CTA, Card Grid, Sidebar+Content, Full-width Scroll, Split Screen, Data Table, Masonry, F-Pattern)"),
    limit: z
      .number()
      .min(1)
      .max(50)
      .default(10)
      .describe("결과 수 (기본 10, 최대 50)"),
  },
  async ({ query, page_purpose, layout_type, limit }) => {
    let q = supabase.from("layouts").select("*");

    if (page_purpose) q = q.eq("page_purpose", page_purpose);
    if (layout_type) q = q.eq("layout_type", layout_type);
    if (query) q = q.textSearch("search_vector", query);

    const { data, error } = await q
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      return { content: [{ type: "text" as const, text: `Error: ${error.message}` }], isError: true };
    }

    if (!data || data.length === 0) {
      return { content: [{ type: "text" as const, text: "검색 결과가 없습니다." }] };
    }

    const results = data.map((layout) => ({
      id: layout.id,
      title: layout.title || layout.og_title || "Untitled",
      url: layout.url,
      page_purpose: `${layout.page_purpose} (${PURPOSE_META[layout.page_purpose]?.label || layout.page_purpose})`,
      layout_type: `${layout.layout_type} (${LAYOUT_META[layout.layout_type]?.label || layout.layout_type})`,
      screenshot_url: layout.screenshot_path ? screenshotUrl(layout.screenshot_path) : null,
      created_at: layout.created_at,
    }));

    return {
      content: [
        {
          type: "text" as const,
          text: `${results.length}개의 레이아웃을 찾았습니다:\n\n${JSON.stringify(results, null, 2)}`,
        },
      ],
    };
  }
);

// Tool 2: get_layout
server.tool(
  "get_layout",
  "특정 레이아웃의 상세 정보를 조회합니다. ID 또는 URL로 검색합니다.",
  {
    id: z.string().optional().describe("레이아웃 UUID"),
    url: z.string().optional().describe("레이아웃 URL (정확히 일치)"),
  },
  async ({ id, url }) => {
    if (!id && !url) {
      return { content: [{ type: "text" as const, text: "id 또는 url 중 하나를 지정해주세요." }], isError: true };
    }

    let q = supabase.from("layouts").select("*");
    if (id) q = q.eq("id", id);
    if (url) q = q.eq("url", url);

    const { data, error } = await q.limit(1).single();

    if (error) {
      return { content: [{ type: "text" as const, text: `Error: ${error.message}` }], isError: true };
    }

    const layout = {
      ...data,
      page_purpose_label: PURPOSE_META[data.page_purpose]?.label,
      layout_type_label: LAYOUT_META[data.layout_type]?.label,
      screenshot_url: data.screenshot_path ? screenshotUrl(data.screenshot_path) : null,
    };

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(layout, null, 2),
        },
      ],
    };
  }
);

// Tool 3: list_categories
server.tool(
  "list_categories",
  "사용 가능한 레이아웃 카테고리 목록을 반환합니다. 페이지 목적(page_purpose)과 레이아웃 유형(layout_type) 두 종류입니다.",
  {},
  async () => {
    const categories = {
      page_purposes: PAGE_PURPOSES.map((value) => ({
        value,
        label: PURPOSE_META[value].label,
        description: PURPOSE_META[value].description,
      })),
      layout_types: LAYOUT_TYPES.map((value) => ({
        value,
        label: LAYOUT_META[value].label,
        description: LAYOUT_META[value].description,
      })),
    };

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(categories, null, 2),
        },
      ],
    };
  }
);

// --- Start ---

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Layout Collector MCP server running on stdio");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
