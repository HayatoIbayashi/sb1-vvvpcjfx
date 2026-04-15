import { describe, expect, it } from 'vitest';
import {
  buildSubscriptionCompletionPath,
  buildSubscriptionPath,
  getReturnToFromLocation,
  normalizeReturnTo,
} from './subscriptionNavigation';

describe('subscriptionNavigation', () => {
  it('builds subscription paths with a safe return target', () => {
    expect(buildSubscriptionPath('/movies/movie-1')).toBe(
      '/subscription?returnTo=%2Fmovies%2Fmovie-1',
    );
    expect(buildSubscriptionCompletionPath('/watch/movie-1')).toBe(
      '/subscription/complete?returnTo=%2Fwatch%2Fmovie-1',
    );
  });

  it('rejects unsafe return targets', () => {
    expect(normalizeReturnTo('https://example.com')).toBe('/');
    expect(normalizeReturnTo('//example.com')).toBe('/');
    expect(normalizeReturnTo('/subscription/complete?returnTo=%2Fmovies%2Fmovie-1')).toBe('/');
  });

  it('derives the current screen including query and hash', () => {
    expect(getReturnToFromLocation({
      pathname: '/search',
      search: '?q=test',
      hash: '#top',
    })).toBe('/search?q=test#top');
  });
});
