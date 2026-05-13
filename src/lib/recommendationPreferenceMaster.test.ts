import { describe, expect, it } from 'vitest';
import {
  getRecommendationGenreLabels,
  getRecommendationGenreSectionTitle,
  matchesRecommendationGenre,
} from './recommendationPreferenceMaster';

describe('recommendationPreferenceMaster', () => {
  it('returns the section title for a recommendation genre id', () => {
    expect(getRecommendationGenreSectionTitle('gambling')).toBe('ギャンブル');
    expect(getRecommendationGenreSectionTitle('unknown')).toBeNull();
  });

  it('matches movie genres against the configured recommendation genre', () => {
    expect(matchesRecommendationGenre('gambling', ['ギャンブル'])).toBe(true);
    expect(matchesRecommendationGenre('gambling', [' アクション ', 'ギャンブル'])).toBe(true);
    expect(matchesRecommendationGenre('gambling', ['アクション'])).toBe(false);
    expect(matchesRecommendationGenre('unknown', ['ギャンブル'])).toBe(false);
  });

  it('returns selected recommendation labels before fallback labels', () => {
    expect(getRecommendationGenreLabels(['gambling', 'horror'], 3)).toEqual([
      'ギャンブル',
      'ホラー描写',
      '過激な暴力表現',
    ]);
  });
});
