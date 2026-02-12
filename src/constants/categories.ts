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
