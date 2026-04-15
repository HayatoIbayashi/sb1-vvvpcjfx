import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { Crown, Heart, Play } from 'lucide-react';
import type { Database } from '../lib/types';
import { Header } from './common/Header';
import { MOCK_MOVIES } from '../mockData';
import { useAuthStatus } from '../lib/authBridge';
import { buildSubscriptionPath, getReturnToFromLocation } from '../lib/subscriptionNavigation';
import { getTestMovieThumbnail } from '../lib/testMovieThumbnails';
import useApiClient from '../lib/useApiClient';
import ReviewSection from './ReviewSection';
import { MEMBERSHIP_MONTHLY_PRICE, useMembershipStatus } from '../lib/useMembershipStatus';

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

  const [movie, setMovie] = useState<Movie | null>(null);
  const [isInWatchlist, setIsInWatchlist] = useState(false);
  const [isWatchlistBusy, setIsWatchlistBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadMovie = async () => {
      if (!movieId) return;

      if (useMockMovies) {
        const foundMovie = MOCK_MOVIES.find((item) => item.id === movieId) ?? null;
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
        const fallback = MOCK_MOVIES.find((item) => item.id === movieId) ?? null;
        if (!cancelled) {
          setMovie(fallback);
        }
      }
    };

    void loadMovie();
    return () => {
      cancelled = true;
    };
  }, [api, movieId, useMockMovies]);

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
      alert('マイリストの更新に失敗しました');
    } finally {
      setIsWatchlistBusy(false);
    }
  };

  const renderPrimaryActions = () => {
    if (isMembershipLoading && isAuthenticated) {
      return (
        <div className="rounded-xl border border-gray-700 bg-gray-800/80 px-5 py-4 text-sm text-gray-300">
          メンバーシップ状態を確認しています...
        </div>
      );
    }

    if (accessState === 'member') {
      return (
        <button
          onClick={() => navigate(`/watch/${movieId}`)}
          className="flex min-w-[220px] items-center justify-center gap-2 rounded-xl bg-white px-6 py-4 font-semibold text-gray-900 transition hover:bg-gray-100"
        >
          <Play className="h-5 w-5" />
          今すぐ視聴する
        </button>
      );
    }

    if (accessState === 'registered') {
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

  const accessStatusText = isMembershipLoading && isAuthenticated
    ? '確認中'
    : ({
        guest: '未ログイン',
        registered: '会員登録済み',
        member: 'メンバーシップ登録済み',
      }[accessState]);

  const accessDescription = isMembershipLoading && isAuthenticated
    ? 'メンバーシップ状態を確認しています。'
    : ({
        guest: '作品の視聴には会員登録が必要です。ログイン後にメンバーシップへ登録できます。',
        registered: `現在は無料会員です。月額 ${MEMBERSHIP_MONTHLY_PRICE.toLocaleString()} 円のメンバーシップ登録で全作品を視聴できます。`,
        member: 'メンバーシップ登録済みです。この作品をすぐに視聴できます。',
      }[accessState]);

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
                alt={movie.title}
                className="w-full rounded-lg shadow-lg"
              />
            </div>
            <div className="md:w-2/3">
              <h1 className="mb-4 text-3xl font-bold text-white">{movie.title}</h1>
              <p className="mb-6 text-gray-300">{movie.description}</p>

              <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-3">
                <div>
                  <h3 className="font-semibold text-gray-400">公開日</h3>
                  <p className="text-white">{movie.release_date || '-'}</p>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-400">時間</h3>
                  <p className="text-white">{movie.duration || '-'}</p>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-400">視聴方法</h3>
                  <p className="text-white">メンバーシップ見放題</p>
                </div>
              </div>

              <div className="mb-6 rounded-2xl border border-amber-400/30 bg-amber-500/10 p-5">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-200">
                      Access
                    </p>
                    <p className="mt-2 text-xl font-semibold text-white">{accessStatusText}</p>
                    <p className="mt-2 text-sm leading-6 text-amber-50/90">{accessDescription}</p>
                  </div>
                  <div className="rounded-full border border-amber-300/30 bg-black/20 px-4 py-2 text-sm text-amber-100">
                    月額 {MEMBERSHIP_MONTHLY_PRICE.toLocaleString()} 円
                  </div>
                </div>
              </div>

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
