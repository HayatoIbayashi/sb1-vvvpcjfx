import type { AdminMovieWritePayload } from '../../lib/apiClient';
import type { Database } from '../../lib/types';

type Movie = Database['public']['Tables']['movies']['Row'];

function normalizeNullableText(value: string | null | undefined) {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export function createEmptyFormData(): Partial<Movie> {
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
  };
}

export function splitCsv(value: string) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export function buildMoviePayload(formData: Partial<Movie>): AdminMovieWritePayload {
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
  };
}
