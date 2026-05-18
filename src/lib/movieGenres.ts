import { RECOMMENDATION_GENRE_MASTER } from './recommendationPreferenceMaster';

type MovieGenreLike = {
  genre?: string[] | null;
};

export const MOVIE_GENRE_MASTER = RECOMMENDATION_GENRE_MASTER.map((option) => option.label);

function normalizeGenre(value: string) {
  return value.trim();
}

export function getMovieGenres(movie: MovieGenreLike | null | undefined) {
  return (movie?.genre ?? [])
    .map((genre) => normalizeGenre(String(genre)))
    .filter(Boolean);
}

export function getPrimaryMovieGenre(
  movie: MovieGenreLike | null | undefined,
  fallback = 'ジャンル未設定',
) {
  return getMovieGenres(movie)[0] ?? fallback;
}

export function getMovieGenreSummary(
  movie: MovieGenreLike | null | undefined,
  fallback = 'ジャンル未設定',
) {
  const genres = getMovieGenres(movie);
  return genres.length ? genres.join(' / ') : fallback;
}

export function getAvailableMovieGenres(selectedGenres: string[] | null | undefined = []) {
  return Array.from(
    new Set([
      ...MOVIE_GENRE_MASTER,
      ...(selectedGenres ?? []).map((genre) => normalizeGenre(String(genre))).filter(Boolean),
    ]),
  );
}

export function toggleMovieGenre(selectedGenres: string[] | null | undefined, genre: string) {
  const normalizedGenre = normalizeGenre(genre);
  if (!normalizedGenre) {
    return getMovieGenres({ genre: selectedGenres ?? [] });
  }

  const genres = getMovieGenres({ genre: selectedGenres ?? [] });
  return genres.includes(normalizedGenre)
    ? genres.filter((item) => item !== normalizedGenre)
    : [...genres, normalizedGenre];
}

export function getMovieGenreOptions(movies: Array<MovieGenreLike | null | undefined>) {
  const genres = movies.flatMap((movie) => getMovieGenres(movie));
  return Array.from(new Set(genres)).sort((left, right) => left.localeCompare(right, 'ja'));
}
