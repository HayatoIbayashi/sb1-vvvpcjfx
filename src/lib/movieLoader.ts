import { MOCK_MOVIES } from '../mockData';
import { getLocalMockMovie } from './mockMovieResolver';
import type { Database } from './types';

type Movie = Database['public']['Tables']['movies']['Row'];

type MovieApi = {
  getMovie: (id: string) => Promise<Movie>;
};

type LoadMovieByIdOptions = {
  api: MovieApi;
  id: string;
  useMockMovies: boolean;
};

export async function loadMovieById({ api, id, useMockMovies }: LoadMovieByIdOptions) {
  const localMockMovie = getLocalMockMovie(id);
  const shouldUseLocalMockMovie = !!localMockMovie && !useMockMovies;

  if (useMockMovies || shouldUseLocalMockMovie) {
    return localMockMovie ?? MOCK_MOVIES.find((movie) => movie.id === id) ?? null;
  }

  try {
    return await api.getMovie(id);
  } catch (error) {
    if (localMockMovie) {
      return localMockMovie;
    }

    throw error;
  }
}
