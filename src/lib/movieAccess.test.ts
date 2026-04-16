import { describe, expect, it } from 'vitest';
import {
  canAccessMovie,
  getMovieAccessLabel,
  getMovieAccessTier,
  partitionMoviesByAccess,
  toMovieAccessPayload,
} from './movieAccess';

describe('movieAccess', () => {
  it('maps legacy price fields to public or membership access tiers', () => {
    expect(getMovieAccessTier({ price: 0, rental_price: 0 })).toBe('public');
    expect(getMovieAccessTier({ price: 1, rental_price: 0 })).toBe('member');
    expect(getMovieAccessTier({ price: 1, rental_price: 1 })).toBe('member');
  });

  it('checks whether the current viewer can watch the movie', () => {
    expect(canAccessMovie('guest', { price: 0, rental_price: 0 })).toBe(true);
    expect(canAccessMovie('guest', { price: 1, rental_price: 0 })).toBe(false);
    expect(canAccessMovie('registered', { price: 1, rental_price: 0 })).toBe(false);
    expect(canAccessMovie('member', { price: 1, rental_price: 1 })).toBe(true);
  });

  it('builds admin payload markers from access tier', () => {
    expect(toMovieAccessPayload('public')).toEqual({ price: 0, rental_price: 0 });
    expect(toMovieAccessPayload('member')).toEqual({ price: 1, rental_price: 1 });
  });

  it('partitions movies by access tier', () => {
    const partitions = partitionMoviesByAccess([
      { price: 0, rental_price: 0 },
      { price: 1, rental_price: 0 },
      { price: 1, rental_price: 1 },
    ]);

    expect(partitions.publicMovies).toHaveLength(1);
    expect(partitions.memberMovies).toHaveLength(2);
    expect(getMovieAccessLabel('member')).toBe('メンバーシップ登録で視聴');
  });
});
