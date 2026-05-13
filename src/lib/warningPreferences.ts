import { RECOMMENDATION_CONTENT_FILTER_MASTER } from './recommendationPreferenceMaster';
import { getMovieGenres } from './movieGenres';

type MovieGenreLike = {
  genre?: string[] | null;
};

const LS_RECOMMENDATION_PREFERENCES = 'account_recommendation_preferences_v1';

function normalizeGenre(value: string) {
  return value.trim().toLocaleLowerCase('ja-JP');
}

function getWarningLabelMap() {
  return new Map(RECOMMENDATION_CONTENT_FILTER_MASTER.map((option) => [option.id, option.label]));
}

export function getStoredWarningGenreLabels() {
  try {
    const raw = localStorage.getItem(LS_RECOMMENDATION_PREFERENCES);
    if (!raw) return [];

    const parsed = JSON.parse(raw) as { warningCategoryIds?: unknown };
    const warningIds = Array.isArray(parsed?.warningCategoryIds)
      ? parsed.warningCategoryIds.filter((value): value is string => typeof value === 'string')
      : [];
    const labelMap = getWarningLabelMap();

    return Array.from(
      new Set(
        warningIds
          .map((id) => labelMap.get(id))
          .filter((label): label is string => typeof label === 'string' && label.trim().length > 0),
      ),
    );
  } catch {
    return [];
  }
}

export function getMatchingWarningGenres(
  movie: MovieGenreLike | null | undefined,
  warningGenreLabels: string[],
) {
  const warningGenreSet = new Set(
    warningGenreLabels.map((label) => normalizeGenre(label)).filter(Boolean),
  );

  return getMovieGenres(movie).filter((genre) => warningGenreSet.has(normalizeGenre(genre)));
}
