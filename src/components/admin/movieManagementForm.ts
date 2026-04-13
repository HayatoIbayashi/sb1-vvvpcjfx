import type { AdminMovieWritePayload } from '../../lib/apiClient';
import type { Database } from '../../lib/types';

type Movie = Database['public']['Tables']['movies']['Row'];

export function createEmptyFormData(): Partial<Movie> {
  return {
    title: '',
    description: '',
    thumbnail: '',
    thumbnail_top: '',
    thumbnail_detail: '',
    release_date: '',
    duration: '',
    price: 0,
    rental_price: 0,
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
    description: formData.description ?? null,
    thumbnail: formData.thumbnail ?? null,
    thumbnail_top: formData.thumbnail_top ?? null,
    thumbnail_detail: formData.thumbnail_detail ?? null,
    release_date: formData.release_date ?? null,
    duration: formData.duration ?? null,
    price: formData.price ?? 0,
    rental_price: formData.rental_price ?? 0,
    genre: formData.genre ?? [],
    cast: formData.cast ?? [],
  };
}
