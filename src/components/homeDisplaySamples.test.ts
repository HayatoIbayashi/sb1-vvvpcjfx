import { describe, expect, it } from 'vitest';
import {
  getHomeMemberCatalogFallbackItems,
  getHomeMovieListTestSections,
  getHomePublicCatalogFallbackItems,
  HOME_DISPLAY_SAMPLES,
  HOME_MEMBER_CATALOG_FALLBACK_ITEMS,
  HOME_MOVIE_LIST_TEST_SECTIONS,
  HOME_PUBLIC_CATALOG_FALLBACK_ITEMS,
} from './homeDisplaySamples';

describe('HOME_DISPLAY_SAMPLES', () => {
  it('provides three fixed samples for the top page test display', () => {
    expect(HOME_DISPLAY_SAMPLES).toHaveLength(3);
    expect(HOME_DISPLAY_SAMPLES.map((sample) => sample.title)).toEqual([
      'サンプル動画 01',
      'サンプル動画 02',
      'サンプル動画 03',
    ]);
  });

  it('uses inline svg images for all top page samples', () => {
    for (const sample of HOME_DISPLAY_SAMPLES) {
      expect(sample.image.startsWith('data:image/svg+xml')).toBe(true);
      expect(sample.description.length).toBeGreaterThan(10);
    }
  });
});

describe('HOME_MOVIE_LIST_TEST_SECTIONS', () => {
  it('provides a fixed post-login test section', () => {
    expect(HOME_MOVIE_LIST_TEST_SECTIONS.map((section) => section.title)).toEqual([
      'ログイン後のおすすめ動画',
    ]);
    expect(HOME_MOVIE_LIST_TEST_SECTIONS[0].items).toHaveLength(3);
  });

  it('uses inline svg images for all list test samples', () => {
    for (const section of HOME_MOVIE_LIST_TEST_SECTIONS) {
      for (const item of section.items) {
        expect(item.image.startsWith('data:image/svg+xml')).toBe(true);
        expect(item.description.length).toBeGreaterThan(10);
      }
    }
  });

  it('replaces test genres with provided recommendation genre labels', () => {
    const sections = getHomeMovieListTestSections(['ホラー描写', 'ギャンブル', '性的表現']);

    expect(sections[0].items.map((item) => item.subtitle)).toEqual([
      'ホラー描写',
      'ギャンブル',
      '性的表現',
    ]);
  });
});

describe('catalog fallback test items', () => {
  it('provides fixed public and member fallback cards', () => {
    expect(HOME_PUBLIC_CATALOG_FALLBACK_ITEMS).toHaveLength(3);
    expect(HOME_MEMBER_CATALOG_FALLBACK_ITEMS).toHaveLength(3);
  });

  it('replaces fallback subtitles with provided recommendation genre labels', () => {
    const publicItems = getHomePublicCatalogFallbackItems(['ホラー描写', 'ギャンブル', '性的表現']);
    const memberItems = getHomeMemberCatalogFallbackItems(['ホラー描写', 'ギャンブル', '性的表現']);

    expect(publicItems.map((item) => item.subtitle)).toEqual([
      'ホラー描写',
      'ギャンブル',
      '性的表現',
    ]);
    expect(memberItems.map((item) => item.subtitle)).toEqual([
      'ホラー描写',
      'ギャンブル',
      '性的表現',
    ]);
  });
});
