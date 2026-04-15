import { describe, expect, it } from 'vitest';
import { getTestMovieThumbnail } from './testMovieThumbnails';

describe('testMovieThumbnails', () => {
  it('returns an SVG data URL for poster thumbnails', () => {
    const result = getTestMovieThumbnail({
      id: 'movie-1',
      title: 'テスト映画：アクション',
      release_date: '2026-04-15',
    });

    expect(result.startsWith('data:image/svg+xml;charset=UTF-8,')).toBe(true);
    expect(decodeURIComponent(result)).toContain('テスト動画：アクション');
    expect(decodeURIComponent(result)).not.toContain('テスト映画');
    expect(decodeURIComponent(result)).toContain('カード表示');
    expect(decodeURIComponent(result)).toContain('公開日 2026-04-15');
  });

  it('changes layout metadata by variant', () => {
    const hero = decodeURIComponent(getTestMovieThumbnail({ id: 'movie-2', title: 'Banner' }, 'hero'));
    const detail = decodeURIComponent(getTestMovieThumbnail({ id: 'movie-2', title: 'Banner' }, 'detail'));

    expect(hero).toContain('viewBox="0 0 1600 900"');
    expect(hero).toContain('メイン表示');
    expect(detail).toContain('viewBox="0 0 1080 1350"');
    expect(detail).toContain('詳細表示');
  });
});
