import { describe, expect, it } from 'vitest';
import {
  getAvailableMovieGenres,
  getMovieGenreSummary,
  getMovieGenres,
  getPrimaryMovieGenre,
  toggleMovieGenre,
} from './movieGenres';

describe('movieGenres', () => {
  it('returns normalized genre values from a movie', () => {
    expect(getMovieGenres({ genre: [' ホラー描写 ', '', '過度な暴力表現'] })).toEqual([
      'ホラー描写',
      '過度な暴力表現',
    ]);
  });

  it('builds genre display strings with fallbacks', () => {
    expect(getPrimaryMovieGenre({ genre: ['ホラー描写', '過度な暴力表現'] })).toBe('ホラー描写');
    expect(getMovieGenreSummary({ genre: ['ホラー描写', '過度な暴力表現'] })).toBe(
      'ホラー描写 / 過度な暴力表現',
    );
    expect(getMovieGenreSummary({ genre: [] })).toBe('ジャンル未設定');
  });

  it('keeps legacy selected genres in the selectable options', () => {
    expect(getAvailableMovieGenres(['テストジャンルA'])).toContain('テストジャンルA');
  });

  it('toggles selected genres on and off', () => {
    expect(toggleMovieGenre(['ホラー描写'], '過度な暴力表現')).toEqual([
      'ホラー描写',
      '過度な暴力表現',
    ]);
    expect(toggleMovieGenre(['ホラー描写'], 'ホラー描写')).toEqual([]);
  });
});
