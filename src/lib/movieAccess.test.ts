import { describe, expect, it } from 'vitest';
import {
  canAccessMovie,
  getMovieAccessLabel,
  getMovieAccessTier,
  partitionMoviesByAccess,
  toMovieAccessPayload,
} from './movieAccess';

describe('movieAccess', () => {
  it('maps access_mode and legacy price fields to access tiers', () => {
    expect(getMovieAccessTier({ access_mode: 'public', price: 1, rental_price: 1 })).toBe('public');
    expect(getMovieAccessTier({ access_mode: 'purchase_only', price: 0, rental_price: 0 })).toBe('purchase');
    expect(getMovieAccessTier({ price: 0, rental_price: 0 })).toBe('public');
    expect(getMovieAccessTier({ price: 1, rental_price: 0 })).toBe('member');
    expect(getMovieAccessTier({ price: 1, rental_price: 1 })).toBe('member');
  });

  it('checks whether the current viewer can watch the movie', () => {
    expect(canAccessMovie('guest', { price: 0, rental_price: 0 })).toBe(true);
    expect(canAccessMovie('guest', { access_mode: 'purchase_only' }, { hasPurchased: true })).toBe(false);
    expect(canAccessMovie('registered', { access_mode: 'purchase_only' })).toBe(false);
    expect(canAccessMovie('registered', { access_mode: 'purchase_only' }, { hasPurchased: true })).toBe(true);
    expect(canAccessMovie('member', { price: 1, rental_price: 1 })).toBe(true);
  });

  it('builds admin payload markers from access tier', () => {
    expect(toMovieAccessPayload('public')).toEqual({
      access_mode: 'public',
      buy_price: 0,
      currency: 'JPY',
      price: 0,
      rental_price: 0,
    });
    expect(toMovieAccessPayload('purchase', 1200)).toEqual({
      access_mode: 'purchase_only',
      buy_price: 1200,
      currency: 'JPY',
      price: 1200,
      rental_price: 0,
    });
  });

  it('partitions movies by access tier', () => {
    const partitions = partitionMoviesByAccess([
      { price: 0, rental_price: 0 },
      { price: 1, rental_price: 0 },
      { access_mode: 'purchase_only' as const, price: 0, rental_price: 0 },
    ]);

    expect(partitions.publicMovies).toHaveLength(1);
    expect(partitions.memberMovies).toHaveLength(2);
    expect(getMovieAccessLabel('purchase')).toBe('単品購入済みで視聴');
  });
});
