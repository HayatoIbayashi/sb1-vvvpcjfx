import { describe, expect, it } from 'vitest';
import { matchesMovieSearchQuery } from './movieSearch';

const baseMovie = {
  id: 'movie-1',
  title: 'テスト動画：アクション',
  description: '近未来アクション作品',
  thumbnail: null,
  thumbnail_top: null,
  thumbnail_detail: null,
  release_date: '2026-04-01',
  duration: '90分',
  genre: ['アクション'],
  cast: ['出演者A', '出演者B'],
  director: null,
  release_year: 2026,
  price: 1000,
  rental_price: 0,
  is_published: true,
  publish_at: '2026-04-01T00:00:00.000Z',
  unpublish_at: null,
  view_window_days: 2,
  created_at: '2026-04-01T00:00:00.000Z',
  updated_at: '2026-04-01T00:00:00.000Z',
};

describe('matchesMovieSearchQuery', () => {
  it('matches by title and description', () => {
    expect(matchesMovieSearchQuery(baseMovie, 'アクション')).toBe(true);
    expect(matchesMovieSearchQuery(baseMovie, '近未来')).toBe(true);
  });

  it('matches by cast name', () => {
    expect(matchesMovieSearchQuery(baseMovie, '出演者A')).toBe(true);
    expect(matchesMovieSearchQuery(baseMovie, '出演者b')).toBe(true);
  });

  it('returns false when the query is not present', () => {
    expect(matchesMovieSearchQuery(baseMovie, '出演者C')).toBe(false);
  });
});
