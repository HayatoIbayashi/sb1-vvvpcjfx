export type RecommendationPreferences = {
  hiddenCategoryIds: string[];
  warningCategoryIds: string[];
  desiredGenreIds: string[];
};

function normalizeSelection(value: unknown) {
  if (!Array.isArray(value)) return [];

  return Array.from(
    new Set(
      value
        .filter((item): item is string => typeof item === 'string')
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  );
}

export function normalizeRecommendationPreferences(value: unknown): RecommendationPreferences {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {
      hiddenCategoryIds: [],
      warningCategoryIds: [],
      desiredGenreIds: [],
    };
  }

  const raw = value as Record<string, unknown>;
  const hiddenCategoryIds = normalizeSelection(raw.hiddenCategoryIds);
  const warningCategoryIds = normalizeSelection(raw.warningCategoryIds).filter(
    (id) => !hiddenCategoryIds.includes(id),
  );
  const desiredGenreIds = normalizeSelection(raw.desiredGenreIds);

  return {
    hiddenCategoryIds,
    warningCategoryIds,
    desiredGenreIds,
  };
}

export function parseRecommendationPreferencesBody(body: Record<string, unknown>) {
  const hasCamelCase = Object.prototype.hasOwnProperty.call(body, 'recommendationPreferences');
  const hasSnakeCase = Object.prototype.hasOwnProperty.call(body, 'recommendation_preferences');

  if (!hasCamelCase && !hasSnakeCase) {
    return undefined;
  }

  return normalizeRecommendationPreferences(
    hasCamelCase ? body.recommendationPreferences : body.recommendation_preferences,
  );
}
