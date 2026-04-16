import { describe, expect, it } from 'vitest';
import { getLocalMockMovie, isUuidMovieId } from './mockMovieResolver';

describe('mockMovieResolver', () => {
  it('identifies uuid movie ids', () => {
    expect(isUuidMovieId('123e4567-e89b-12d3-a456-426614174000')).toBe(true);
    expect(isUuidMovieId('2')).toBe(false);
    expect(isUuidMovieId('movie-1')).toBe(false);
  });

  it('returns local mock movies for known mock ids', () => {
    expect(getLocalMockMovie('2')?.title).toBe('RE:BORN');
    expect(getLocalMockMovie('missing')).toBeNull();
  });
});
