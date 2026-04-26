import { describe, expect, it } from 'vitest';
import {
  getHomeMemberCatalogFallbackItems,
  getHomeMovieListTestItem,
  getHomeMovieListTestSections,
  getHomePublicCatalogFallbackItems,
} from './homeDisplaySamples';

describe('homeDisplaySamples', () => {
  it('provides a fixed post-login test section', () => {
    const sections = getHomeMovieListTestSections();

    expect(sections.map((section) => section.title)).toEqual([
      'ログイン後のおすすめ動画',
    ]);
    expect(sections[0].items).toHaveLength(3);
  });

  it('uses inline svg images for all generated samples', () => {
    const sections = getHomeMovieListTestSections();
    const publicFallbackItems = getHomePublicCatalogFallbackItems();
    const memberFallbackItems = getHomeMemberCatalogFallbackItems();

    for (const item of [
      ...sections.flatMap((section) => section.items),
      ...publicFallbackItems,
      ...memberFallbackItems,
    ]) {
      expect(item.image.startsWith('data:image/svg+xml')).toBe(true);
      expect(item.description.length).toBeGreaterThan(10);
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

  it('provides fixed public and member fallback cards', () => {
    expect(getHomePublicCatalogFallbackItems()).toHaveLength(3);
    expect(getHomeMemberCatalogFallbackItems()).toHaveLength(3);
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

  it('resolves detail items from all generated sample groups', () => {
    expect(getHomeMovieListTestItem('member-test-1')?.detail.title).toBe('ログイン後詳細テスト 01');
    expect(getHomeMovieListTestItem('public-test-1')?.detail.title).toBe('紹介動画テスト詳細 01');
    expect(getHomeMovieListTestItem('member-catalog-test-1')?.detail.title).toBe('会員向け一覧テスト詳細 01');
    expect(getHomeMovieListTestItem('not-found')).toBeNull();
  });
});
