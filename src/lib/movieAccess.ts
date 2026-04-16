import type { AdminMovieWritePayload, Movie } from './apiClient';
import type { MembershipAccessState } from './useMembershipStatus';

export type MovieAccessTier = 'public' | 'registered' | 'member';

type MovieAccessLike = Pick<Movie, 'price' | 'rental_price'>;

const ACCESS_RANK: Record<MovieAccessTier, number> = {
  public: 0,
  registered: 1,
  member: 2,
};

const VIEWER_RANK: Record<MembershipAccessState, number> = {
  guest: 0,
  registered: 1,
  member: 2,
};

export function getMovieAccessTier(movie: MovieAccessLike): MovieAccessTier {
  const price = Number(movie.price || 0);
  const rentalPrice = Number(movie.rental_price || 0);

  if (rentalPrice > 0) return 'member';
  if (price > 0) return 'registered';
  return 'public';
}

export function canAccessMovie(accessState: MembershipAccessState, movie: MovieAccessLike) {
  return VIEWER_RANK[accessState] >= ACCESS_RANK[getMovieAccessTier(movie)];
}

export function getMovieAccessLabel(accessTier: MovieAccessTier) {
  return {
    public: '一般公開',
    registered: '無料会員向け',
    member: 'メンバーシップ限定',
  }[accessTier];
}

export function getMovieAccessSummary(accessTier: MovieAccessTier) {
  return {
    public: 'ログインなしで視聴できます。',
    registered: '無料会員登録で視聴できます。',
    member: 'メンバーシップ登録で視聴できます。',
  }[accessTier];
}

export function getMovieAccessBadgeClass(accessTier: MovieAccessTier) {
  return {
    public: 'border-emerald-400/40 bg-emerald-500/15 text-emerald-100',
    registered: 'border-sky-400/40 bg-sky-500/15 text-sky-100',
    member: 'border-amber-400/40 bg-amber-500/15 text-amber-100',
  }[accessTier];
}

export function toMovieAccessPayload(accessTier: MovieAccessTier): Pick<AdminMovieWritePayload, 'price' | 'rental_price'> {
  switch (accessTier) {
    case 'member':
      return { price: 1, rental_price: 1 };
    case 'registered':
      return { price: 1, rental_price: 0 };
    case 'public':
    default:
      return { price: 0, rental_price: 0 };
  }
}

export function partitionMoviesByAccess<T extends MovieAccessLike>(movies: T[]) {
  return {
    publicMovies: movies.filter((movie) => getMovieAccessTier(movie) === 'public'),
    registeredMovies: movies.filter((movie) => getMovieAccessTier(movie) === 'registered'),
    memberMovies: movies.filter((movie) => getMovieAccessTier(movie) === 'member'),
  };
}
