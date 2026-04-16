import { MOCK_MOVIES } from '../mockData';
import type { Database } from './types';

type Movie = Database['public']['Tables']['movies']['Row'];

const UUID_MOVIE_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuidMovieId(id: string | null | undefined): id is string {
  return typeof id === 'string' && UUID_MOVIE_ID_PATTERN.test(id);
}

export function getLocalMockMovie(id: string | null | undefined): Movie | null {
  if (!id) {
    return null;
  }

  return MOCK_MOVIES.find((movie) => movie.id === id) ?? null;
}
