import { describe, it, expect } from 'vitest';
import { PAGE_PURPOSES, LAYOUT_TYPES } from './categories';

describe('categories', () => {
  it('should have 8 page purposes', () => {
    expect(PAGE_PURPOSES).toHaveLength(8);
  });

  it('should have 8 layout types', () => {
    expect(LAYOUT_TYPES).toHaveLength(8);
  });

  it('should have correct page purposes', () => {
    expect(PAGE_PURPOSES).toEqual([
      'Landing',
      'Dashboard',
      'E-commerce',
      'Blog/Content',
      'Portfolio',
      'SaaS App',
      'Documentation',
      'Social/Community',
    ]);
  });

  it('should have correct layout types', () => {
    expect(LAYOUT_TYPES).toEqual([
      'Hero+CTA',
      'Card Grid',
      'Sidebar+Content',
      'Full-width Scroll',
      'Split Screen',
      'Data Table',
      'Masonry',
      'F-Pattern',
    ]);
  });
});
