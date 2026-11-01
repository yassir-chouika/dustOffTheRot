import { describe, expect, it } from 'vitest';
import { decodeLocator, locatorSchema } from './repository';

describe('format-specific reading positions', () => {
  it('preserves PDF context and EPUB CFIs without confusing their locators', () => {
    expect(decodeLocator('pdf', { page: 3, zoom: 1.25 })).toEqual({
      type: 'pdf',
      page: 3,
      zoom: 1.25,
    });
    expect(decodeLocator('epub', { cfi: 'epubcfi(/6/2!/4/2:0)' })).toEqual({
      type: 'epub',
      cfi: 'epubcfi(/6/2!/4/2:0)',
    });
    expect(decodeLocator('epub', { page: 3 })).toBeNull();
  });
  it('rejects invalid and unbounded stored positions', () => {
    for (const locator of [
      { type: 'pdf', page: -1 },
      { type: 'pdf', page: 1.5 },
      { type: 'pdf', page: 1, zoom: 99 },
      { type: 'epub', cfi: 'javascript:alert(1)' },
    ])
      expect(locatorSchema.safeParse(locator).success).toBe(false);
    expect(decodeLocator('pdf', null)).toBeNull();
  });
});
