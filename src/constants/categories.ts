export const PAGE_PURPOSES = [
  'Landing',
  'Dashboard',
  'E-commerce',
  'Blog/Content',
  'Portfolio',
  'SaaS App',
  'Documentation',
  'Social/Community',
] as const;

export const LAYOUT_TYPES = [
  'Hero+CTA',
  'Card Grid',
  'Sidebar+Content',
  'Full-width Scroll',
  'Split Screen',
  'Data Table',
  'Masonry',
  'F-Pattern',
] as const;

export type PagePurpose = (typeof PAGE_PURPOSES)[number];
export type LayoutType = (typeof LAYOUT_TYPES)[number];

interface CategoryMeta {
  label: string;
  description: string;
}

export const PURPOSE_META: Record<PagePurpose, CategoryMeta> = {
  'Landing': { label: '랜딩 페이지', description: '제품/서비스 소개, 가입·구매 유도' },
  'Dashboard': { label: '대시보드', description: '데이터·지표를 보여주는 관리 화면' },
  'E-commerce': { label: '쇼핑', description: '상품 목록, 상세, 장바구니' },
  'Blog/Content': { label: '블로그·콘텐츠', description: '글, 뉴스, 아티클 등 읽기 중심' },
  'Portfolio': { label: '포트폴리오', description: '작업물·프로젝트 전시' },
  'SaaS App': { label: 'SaaS 앱 화면', description: '에디터, 설정 등 실제 서비스 화면' },
  'Documentation': { label: '문서·가이드', description: 'API 문서, 튜토리얼, 레퍼런스' },
  'Social/Community': { label: '커뮤니티', description: '피드, 프로필, 게시판' },
};

export const LAYOUT_META: Record<LayoutType, CategoryMeta> = {
  'Hero+CTA': { label: '히어로 섹션', description: '큰 비주얼 + 행동 유도 버튼' },
  'Card Grid': { label: '카드 그리드', description: '카드가 격자로 반복 배치' },
  'Sidebar+Content': { label: '사이드바 레이아웃', description: '사이드바 + 메인 콘텐츠 2단 구조' },
  'Full-width Scroll': { label: '풀스크롤', description: '전체 폭, 스크롤로 섹션 전환' },
  'Split Screen': { label: '분할 화면', description: '좌우 또는 상하 반반 분할' },
  'Data Table': { label: '테이블 중심', description: '데이터 테이블/리스트가 핵심' },
  'Masonry': { label: '핀터레스트형', description: '높이 다른 카드가 빈틈없이 채워지는 구성' },
  'F-Pattern': { label: 'F패턴', description: '왼쪽→오른쪽→아래 시선 흐름' },
};
