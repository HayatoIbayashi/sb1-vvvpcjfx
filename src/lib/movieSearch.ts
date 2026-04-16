import type { Database } from './types';

type Movie = Database['public']['Tables']['movies']['Row'];

export function matchesMovieSearchQuery(movie: Movie, query: string) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return true;

  const searchableText = [
    movie.title,
    movie.description || '',
    ...(movie.cast || []),
  ]
    .join(' ')
    .toLowerCase();

  return searchableText.includes(normalizedQuery);
}
