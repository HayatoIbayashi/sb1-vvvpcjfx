import { describe, expect, it } from 'vitest';
import {
  normalizeRecommendationPreferences,
  parseRecommendationPreferencesBody,
} from './recommendationPreferences.js';

describe('recommendationPreferences', () => {
  it('normalizes arrays and removes overlap from warning selections', () => {
    expect(
      normalizeRecommendationPreferences({
        hiddenCategoryIds: [' violence ', 'violence', 'horror'],
        warningCategoryIds: ['violence', 'gambling'],
        desiredGenreIds: ['action', 'documentary', 'action'],
      }),
    ).toEqual({
      hiddenCategoryIds: ['violence', 'horror'],
      warningCategoryIds: ['gambling'],
      desiredGenreIds: ['action', 'documentary'],
    });
  });

  it('returns undefined when the request body does not contain recommendation preferences', () => {
    expect(parseRecommendationPreferencesBody({ email: 'user@example.com' })).toBeUndefined();
  });

  it('accepts snake_case request payloads', () => {
    expect(
      parseRecommendationPreferencesBody({
        recommendation_preferences: {
          hiddenCategoryIds: ['violence'],
          warningCategoryIds: ['horror'],
          desiredGenreIds: ['action'],
        },
      }),
    ).toEqual({
      hiddenCategoryIds: ['violence'],
      warningCategoryIds: ['horror'],
      desiredGenreIds: ['action'],
    });
  });
});
