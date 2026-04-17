import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { Crown, Heart, Play } from 'lucide-react';
import type { Database } from '../lib/types';
import { Header } from './common/Header';
import { MOCK_MOVIES } from '../mockData';
import { getLocalMockMovie } from '../lib/mockMovieResolver';
import { useAuthStatus } from '../lib/authBridge';
import { buildSubscriptionPath, getReturnToFromLocation } from '../lib/subscriptionNavigation';
import { getTestMovieThumbnail } from '../lib/testMovieThumbnails';
import useApiClient from '../lib/useApiClient';
import ReviewSection from './ReviewSection';
import { MEMBERSHIP_MONTHLY_PRICE, useMembershipStatus } from '../lib/useMembershipStatus';
import { getHomeMovieListTestItem } from './homeDisplaySamples';
import { getMovieGenreSummary, getPrimaryMovieGenre } from '../lib/movieGenres';
import {
  canAccessMovie,
  getMovieAccessBadgeClass,
  getMovieAccessLabel,
  getMovieAccessSummary,
  getMovieAccessTier,
} from '../lib/movieAccess';

type Movie = Database['public']['Tables']['movies']['Row'];

function MovieDetailPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { id: movieId } = useParams<{ id: string }>();
  const api = useApiClient();
  const { isAuthenticated, logoutAll } = useAuthStatus();
  const { accessState, isLoading: isMembershipLoading } = useMembershipStatus();
  const useMockMovies = import.meta.env.VITE_USE_MOCK_MOVIES === 'true';
  const subscriptionPath = useMemo(
    () => buildSubscriptionPath(getReturnToFromLocation(location)),
    [location],
  );
  const testDetailId = useMemo(
    () => new URLSearchParams(location.search).get('testDetailId'),
    [location.search],
  );
  const testDetailItem = useMemo(
    () => getHomeMovieListTestItem(testDetailId),
    [testDetailId],
  );
  const localMockMovie = useMemo(() => getLocalMockMovie(movieId), [movieId]);
  const shouldUseLocalMockMovie = useMemo(
    () => !!localMockMovie && !useMockMovies,
    [localMockMovie, useMockMovies],
  );

  const [movie, setMovie] = useState<Movie | null>(null);
  const [isInWatchlist, setIsInWatchlist] = useState(false);
  const [isWatchlistBusy, setIsWatchlistBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadMovie = async () => {
      if (!movieId) return;

      if (useMockMovies || shouldUseLocalMockMovie) {
        const foundMovie = localMockMovie ?? MOCK_MOVIES.find((item) => item.id === movieId) ?? null;
        if (!cancelled) {
          setMovie(foundMovie);
        }
        return;
      }

      try {
        const item = await api.getMovie(movieId);
        if (!cancelled) {
          setMovie(item);
        }
      } catch (error) {
        console.error('Error fetching movie:', error);
        const fallback = localMockMovie ?? MOCK_MOVIES.find((item) => item.id === movieId) ?? null;
        if (!cancelled) {
          setMovie(fallback);
        }
      }
    };

    void loadMovie();
    return () => {
      cancelled = true;
    };
  }, [api, localMockMovie, movieId, shouldUseLocalMockMovie, useMockMovies]);

  useEffect(() => {
    let cancelled = false;

    const loadWatchlist = async () => {
      if (!isAuthenticated || !movieId) {
        if (!cancelled) {
          setIsInWatchlist(false);
        }
        return;
      }

      try {
        const res = await api.getWatchlist();
        if (!cancelled) {
          setIsInWatchlist(res.items.some((item) => item.id === movieId));
        }
      } catch (error) {
        console.error('Error fetching watchlist:', error);
      }
    };

    void loadWatchlist();
    return () => {
      cancelled = true;
    };
  }, [api, isAuthenticated, movieId]);

  const handleToggleWatchlist = async () => {
    if (!movieId) return;
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    try {
      setIsWatchlistBusy(true);
      if (isInWatchlist) {
        await api.removeFromWatchlist(movieId);
        setIsInWatchlist(false);
      } else {
        await api.addToWatchlist(movieId);
        setIsInWatchlist(true);
      }
    } catch (error) {
      console.error('Watchlist update error:', error);
      alert('マイリストの更新に失敗しました。');
    } finally {
      setIsWatchlistBusy(false);
    }
  };

  const movieAccessTier = movie ? getMovieAccessTier(movie) : 'member';
  const canWatchMovie = movie ? canAccessMovie(accessState, movie) : false;
  const displayTitle = testDetailItem?.detail.title ?? movie?.title ?? '';
  const displayDescription = testDetailItem?.detail.description ?? movie?.description ?? '';
  const displayReleaseDate = testDetailItem?.detail.releaseDate ?? movie?.release_date ?? '-';
  const displayDuration = testDetailItem?.detail.duration ?? movie?.duration ?? '-';
  const displayGenreSummary = getMovieGenreSummary(movie);
  const displayPrimaryGenre = getPrimaryMovieGenre(movie);
  const testDetailNote = testDetailItem?.detail.note ?? null;
  const isAccessStatePending = isAuthenticated && isMembershipLoading;

  const renderPrimaryActions = () => {
    if (isAccessStatePending) {
      return null;
    }

    if (canWatchMovie) {
      return (
        <button
          onClick={() => navigate(`/watch/${movieId}?autoplay=1`)}
          className="flex min-w-[220px] items-center justify-center gap-2 rounded-xl bg-white px-6 py-4 font-semibold text-gray-900 transition hover:bg-gray-100"
        >
          <Play className="h-5 w-5" />
          今すぐ視聴する
        </button>
      );
    }

    if (isAuthenticated) {
      return (
        <Link
          to={subscriptionPath}
          className="flex min-w-[240px] items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-pink-500 px-6 py-4 font-semibold text-white shadow-lg transition hover:opacity-95"
        >
          <Crown className="h-5 w-5" />
          月額 {MEMBERSHIP_MONTHLY_PRICE.toLocaleString()} 円で登録
        </Link>
      );
    }

    return (
      <>
        <button
          onClick={() => navigate('/signup')}
          className="min-w-[220px] rounded-xl bg-white px-6 py-4 font-semibold text-gray-900 transition hover:bg-gray-100"
        >
          会員登録する
        </button>
        <button
          onClick={() => navigate('/login')}
          className="min-w-[220px] rounded-xl border border-gray-600 bg-transparent px-6 py-4 font-semibold text-white transition hover:bg-gray-800"
        >
          ログイン
        </button>
      </>
    );
  };

  const accessStatusText = ({
    guest: '未ログイン',
    registered: 'ログイン済み',
    member: 'メンバーシップ登録済み',
  }[accessState]);

  const accessDescription = canWatchMovie
    ? `この作品は${getMovieAccessLabel(movieAccessTier)}です。現在の状態でそのまま視聴できます。`
    : accessState === 'guest'
      ? 'この作品はログイン後にご案内しています。ログイン後、メンバーシップ登録で視聴できます。'
      : `この作品はメンバーシップ登録後に視聴できます。月額 ${MEMBERSHIP_MONTHLY_PRICE.toLocaleString()} 円で登録するとそのまま再生できます。`;

  return (
    <div className="min-h-screen bg-gray-900">
      <Header
        isAuthenticated={isAuthenticated}
        onLogin={() => navigate('/login')}
        onLogout={logoutAll}
        searchQuery=""
        onSearchChange={() => {}}
      />
      {movie && (
        <div className="container mx-auto px-4 pb-8 pt-24">
          <div className="flex flex-col gap-8 md:flex-row">
            <div className="md:w-1/3">
              <img
                src={getTestMovieThumbnail(movie, 'detail')}
                alt={displayTitle}
                className="w-full rounded-lg shadow-lg"
              />
            </div>
            <div className="md:w-2/3">
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <h1 className="text-3xl font-bold text-white">{displayTitle}</h1>
                <span className="rounded-full border border-cyan-400/30 bg-cyan-500/10 px-4 py-1 text-sm font-semibold text-cyan-100">
                  {displayPrimaryGenre}
                </span>
              </div>
              <p className="mb-6 text-gray-300">{displayDescription}</p>

              {testDetailNote && (
                <div className="mb-6 rounded-xl border border-cyan-400/30 bg-cyan-500/10 px-5 py-4 text-sm leading-6 text-cyan-50">
                  {testDetailNote}
                </div>
              )}

              <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-3">
                <div>
                  <h3 className="font-semibold text-gray-400">公開日</h3>
                  <p className="text-white">{displayReleaseDate}</p>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-400">時間</h3>
                  <p className="text-white">{displayDuration}</p>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-400">ジャンル</h3>
                  <p className="text-white">{displayGenreSummary}</p>
                </div>
              </div>

              {!isAccessStatePending && (
                <div className="mb-6 rounded-2xl border border-amber-400/30 bg-amber-500/10 p-5">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-200">
                        Access
                      </p>
                      <p className="mt-2 text-xl font-semibold text-white">{accessStatusText}</p>
                      <p className="mt-2 text-sm leading-6 text-amber-50/90">{accessDescription}</p>
                    </div>
                    <div className={`rounded-full border px-4 py-2 text-sm ${getMovieAccessBadgeClass(movieAccessTier)}`}>
                      {displayPrimaryGenre}
                    </div>
                  </div>
                  <p className="mt-4 text-sm text-amber-50/80">{getMovieAccessSummary(movieAccessTier)}</p>
                </div>
              )}

              <div className="flex flex-wrap gap-4">
                {renderPrimaryActions()}
                <button
                  onClick={() => void handleToggleWatchlist()}
                  disabled={isWatchlistBusy}
                  className="flex min-w-[220px] items-center justify-center gap-2 rounded-xl border border-gray-600 bg-transparent px-6 py-4 font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Heart className={`h-5 w-5 ${isInWatchlist ? 'fill-current text-pink-400' : ''}`} />
                  {isWatchlistBusy
                    ? '更新中...'
                    : isInWatchlist
                      ? 'マイリストから外す'
                      : 'マイリストに追加'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {movieId && (
        <div className="container mx-auto px-4 pb-10">
          <ReviewSection movieId={movieId} />
        </div>
      )}
    </div>
  );
}

export default MovieDetailPage;
