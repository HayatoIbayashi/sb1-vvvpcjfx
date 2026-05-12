import type { AdminMovieWritePayload, Movie } from './apiClient';
import type { MembershipAccessState } from './useMembershipStatus';

export type MovieAccessMode = 'public' | 'purchase_only' | 'subscription_only' | 'subscription_or_purchase';
export type MovieAccessTier = 'public' | 'member' | 'purchase' | 'subscription' | 'subscription_or_purchase';

type MovieAccessLike = Partial<Pick<
  Movie,
  'price' | 'rental_price' | 'access_mode' | 'buy_price' | 'currency' | 'stripe_price_id_one_time'
>>;

const ACCESS_RANK: Record<MovieAccessTier, number> = {
  public: 0,
  member: 2,
  purchase: 2,
  subscription: 2,
  subscription_or_purchase: 2,
};

const VIEWER_RANK: Record<MembershipAccessState, number> = {
  guest: 0,
  registered: 1,
  member: 2,
};

export function getMovieAccessTier(movie: MovieAccessLike): MovieAccessTier {
  if (movie.access_mode === 'public') return 'public';
  if (movie.access_mode === 'purchase_only') return 'purchase';
  if (movie.access_mode === 'subscription_only') return 'subscription';
  if (movie.access_mode === 'subscription_or_purchase') return 'subscription_or_purchase';

  const price = Number(movie.price || 0);
  const rentalPrice = Number(movie.rental_price || 0);

  if (price > 0 || rentalPrice > 0) {
    return 'member';
  }

  return 'public';
}

export function canAccessMovie(
  accessState: MembershipAccessState,
  movie: MovieAccessLike,
  options: { hasPurchased?: boolean } = {},
) {
  const accessTier = getMovieAccessTier(movie);
  if (accessTier === 'public') return true;
  if (accessTier === 'purchase') return accessState !== 'guest' && options.hasPurchased === true;
  if (accessTier === 'subscription_or_purchase') return accessState !== 'guest' && options.hasPurchased === true;
  if (accessTier === 'subscription') return VIEWER_RANK[accessState] >= ACCESS_RANK.subscription;
  return VIEWER_RANK[accessState] >= ACCESS_RANK[accessTier];
}

export function getMovieAccessLabel(accessTier: MovieAccessTier) {
  return {
    public: '一般公開',
    member: 'メンバーシップ登録で視聴',
    purchase: '単品購入済みで視聴',
    subscription: 'サブスクリプションで視聴',
    subscription_or_purchase: '購入済みで視聴',
  }[accessTier];
}

export function getMovieAccessSummary(accessTier: MovieAccessTier) {
  return {
    public: 'ログインなしで視聴できます。',
    member: 'メンバーシップ登録後に視聴できます。',
    purchase: 'この動画は購入済みのアカウントで視聴できます。',
    subscription: 'この動画はサブスクリプション対象として保持されています。',
    subscription_or_purchase: 'この動画は購入済みのアカウントで視聴できます。',
  }[accessTier];
}

export function getMovieAccessBadgeClass(accessTier: MovieAccessTier) {
  return {
    public: 'border-emerald-400/40 bg-emerald-500/15 text-emerald-100',
    member: 'border-amber-400/40 bg-amber-500/15 text-amber-100',
    purchase: 'border-amber-400/40 bg-amber-500/15 text-amber-100',
    subscription: 'border-amber-400/40 bg-amber-500/15 text-amber-100',
    subscription_or_purchase: 'border-amber-400/40 bg-amber-500/15 text-amber-100',
  }[accessTier];
}

export function getMovieBuyPrice(movie: MovieAccessLike) {
  const buyPrice = Number(movie.buy_price || 0);
  if (buyPrice > 0) return buyPrice;
  return Number(movie.price || movie.rental_price || 0);
}

export function getMovieCurrency(movie: MovieAccessLike) {
  return movie.currency || 'JPY';
}

export function toMovieAccessPayload(
  accessTier: MovieAccessTier,
  buyPrice = 0,
): Pick<AdminMovieWritePayload, 'price' | 'rental_price' | 'access_mode' | 'buy_price' | 'currency'> {
  switch (accessTier) {
    case 'purchase':
      return {
        access_mode: 'purchase_only',
        buy_price: Math.max(0, Math.trunc(buyPrice)),
        currency: 'JPY',
        price: buyPrice > 0 ? buyPrice : 1,
        rental_price: 0,
      };
    case 'subscription':
      return { access_mode: 'subscription_only', buy_price: 0, currency: 'JPY', price: 1, rental_price: 1 };
    case 'subscription_or_purchase':
      return {
        access_mode: 'subscription_or_purchase',
        buy_price: Math.max(0, Math.trunc(buyPrice)),
        currency: 'JPY',
        price: buyPrice > 0 ? buyPrice : 1,
        rental_price: 1,
      };
    case 'member':
      return { access_mode: 'subscription_only', buy_price: 0, currency: 'JPY', price: 1, rental_price: 1 };
    case 'public':
    default:
      return { access_mode: 'public', buy_price: 0, currency: 'JPY', price: 0, rental_price: 0 };
  }
}

export function partitionMoviesByAccess<T extends MovieAccessLike>(movies: T[]) {
  return {
    publicMovies: movies.filter((movie) => getMovieAccessTier(movie) === 'public'),
    memberMovies: movies.filter((movie) => getMovieAccessTier(movie) !== 'public'),
  };
}
