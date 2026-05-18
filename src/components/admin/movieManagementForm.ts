import type { AdminMovieWritePayload } from '../../lib/apiClient';
import type { Database } from '../../lib/types';
import { getMovieAccessTier, type MovieAccessTier, toMovieAccessPayload } from '../../lib/movieAccess';

type Movie = Database['public']['Tables']['movies']['Row'];
export type MovieFormData = Partial<Movie> & {
  accessTier: MovieAccessTier;
  buyPrice: number;
  videoFile: File | null;
};

function normalizeNullableText(value: string | null | undefined) {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function normalizeNullableNumber(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return null;
  return value;
}

function normalizeDateForDateInput(value: string | null | undefined) {
  const trimmed = normalizeNullableText(value);
  if (!trimmed) return '';

  const directDateMatch = trimmed.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?:\D.*)?$/);
  if (directDateMatch) {
    const [, year, month, day] = directDateMatch;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }

  return trimmed;
}

export function createEmptyFormData(): MovieFormData {
  return {
    title: '',
    description: '',
    thumbnail: '',
    thumbnail_top: '',
    thumbnail_detail: '',
    release_date: '',
    duration: '',
    genre: [],
    cast: [],
    director: null,
    release_year: null,
    is_published: false,
    is_home_feature: false,
    home_featured_order: null,
    accessTier: 'public',
    buyPrice: 0,
    videoFile: null,
  };
}

export function createMovieFormData(movie: Movie): MovieFormData {
  return {
    title: movie.title,
    description: movie.description || '',
    thumbnail: movie.thumbnail || '',
    thumbnail_top: movie.thumbnail_top || '',
    thumbnail_detail: movie.thumbnail_detail || '',
    release_date: normalizeDateForDateInput(movie.release_date),
    duration: movie.duration || '',
    genre: movie.genre || [],
    cast: movie.cast || [],
    director: movie.director,
    release_year: movie.release_year,
    is_published: movie.is_published,
    is_home_feature: movie.is_home_feature,
    home_featured_order: movie.home_featured_order,
    accessTier: getMovieAccessTier(movie),
    buyPrice: Number(movie.buy_price || movie.price || 0),
    videoFile: null,
  };
}

export function splitCsv(value: string) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export function buildMoviePayload(formData: MovieFormData): AdminMovieWritePayload {
  return {
    title: formData.title || '',
    description: normalizeNullableText(formData.description),
    thumbnail: normalizeNullableText(formData.thumbnail),
    thumbnail_top: normalizeNullableText(formData.thumbnail_top),
    thumbnail_detail: normalizeNullableText(formData.thumbnail_detail),
    release_date: normalizeNullableText(formData.release_date),
    duration: normalizeNullableText(formData.duration),
    genre: formData.genre ?? [],
    cast: formData.cast ?? [],
    director: normalizeNullableText(formData.director),
    release_year: normalizeNullableNumber(formData.release_year),
    is_published: formData.is_published === true,
    is_home_feature: formData.is_home_feature === true,
    home_featured_order: formData.is_home_feature
      ? normalizeNullableNumber(formData.home_featured_order)
      : null,
    ...toMovieAccessPayload(formData.accessTier, Number(formData.buyPrice || formData.buy_price || 0)),
  };
}
