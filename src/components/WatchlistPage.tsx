import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Header } from './common/Header';
import { useAuthStatus } from '../lib/authBridge';
import useApiClient from '../lib/useApiClient';
import type { Movie } from '../lib/apiClient';
import { getTestMovieThumbnail } from '../lib/testMovieThumbnails';
import useHeaderGenres from '../lib/useHeaderGenres';

function matchesQuery(movie: Movie, query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;

  return (
    movie.title.toLowerCase().includes(normalized)
    || (movie.description ?? '').toLowerCase().includes(normalized)
  );
}

export default function WatchlistPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const api = useApiClient();
  const { isAuthenticated, logoutAll } = useAuthStatus();
  const [searchQuery, setSearchQuery] = useState('');
  const [movies, setMovies] = useState<Movie[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [removingMovieId, setRemovingMovieId] = useState<string | null>(null);
  const genreOptions = useHeaderGenres();

  useEffect(() => {
    let cancelled = false;

    const loadWatchlist = async () => {
      if (!isAuthenticated) {
        setIsLoading(false);
        setMovies([]);
        return;
      }

      setIsLoading(true);
      setError(null);
      try {
        const res = await api.getWatchlist();
        if (!cancelled) {
          setMovies(res.items);
        }
      } catch (loadError) {
        console.error('Error fetching watchlist:', loadError);
        if (!cancelled) {
          setError('マイリストの取得に失敗しました。');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadWatchlist();
    return () => {
      cancelled = true;
    };
  }, [api, isAuthenticated]);

  const filteredMovies = useMemo(
    () => movies.filter((movie) => matchesQuery(movie, searchQuery)),
    [movies, searchQuery],
  );

  const handleRemove = async (movieId: string) => {
    try {
      setRemovingMovieId(movieId);
      await api.removeFromWatchlist(movieId);
      setMovies((current) => current.filter((movie) => movie.id !== movieId));
    } catch (removeError) {
      console.error('Error removing watchlist item:', removeError);
      setError('マイリストの更新に失敗しました。');
    } finally {
      setRemovingMovieId(null);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-900">
        <Header
          isAuthenticated={false}
          onLogin={() => navigate('/login')}
          onLogout={logoutAll}
          searchQuery=""
          onSearchChange={() => { }}
          genreOptions={genreOptions}
        />
        <main className="container mx-auto px-4 pt-24 pb-12">
          <div className="mx-auto max-w-xl rounded-lg bg-gray-800 p-8 text-center text-white">
            <h1 className="mb-4 text-2xl font-bold">マイリスト</h1>
            <p className="mb-6 text-gray-300">マイリストを利用するにはログインが必要です。</p>
            <button
              onClick={() => navigate('/login')}
              className="rounded bg-blue-600 px-6 py-2 font-semibold hover:bg-blue-700"
            >
              ログインへ
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <Header
        isAuthenticated={isAuthenticated}
        onLogin={() => navigate('/login')}
        onLogout={logoutAll}
        searchQuery=""
        onSearchChange={() => { }}
        genreOptions={genreOptions}
      />

      <main className="container mx-auto px-4 pt-24 pb-12">
        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">マイリスト</h1>
            <p className="mt-1 text-sm text-gray-400">
              あとで見たい作品を保存できます。現在 {filteredMovies.length} 件です。
            </p>
          </div>
          <button
            onClick={() => navigate('/account')}
            className="rounded-lg border border-gray-700 px-4 py-2 text-sm text-gray-200 hover:bg-gray-800"
          >
            アカウント設定に戻る
          </button>
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="flex h-40 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-white"></div>
          </div>
        ) : filteredMovies.length === 0 ? (
          <div className="rounded-lg bg-gray-800 p-8 text-center text-gray-300">
            {movies.length === 0
              ? 'マイリストに登録された作品はありません。'
              : '検索条件に一致する作品はありません。'}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredMovies.map((movie) => (
              <div key={movie.id} className="overflow-hidden rounded-xl bg-gray-800 shadow-lg">
                <button
                  onClick={() => navigate(`/movies/${movie.id}`, { state: { from: location } })}
                  className="block w-full text-left"
                >
                  <img
                    src={getTestMovieThumbnail(movie, 'card')}
                    alt={movie.title}
                    className="aspect-[2/3] w-full object-cover"
                  />
                </button>
                <div className="space-y-3 p-4">
                  <div>
                    <h2 className="line-clamp-2 text-lg font-semibold text-white">{movie.title}</h2>
                    <p className="mt-2 line-clamp-3 text-sm text-gray-400">{movie.description || '説明はありません。'}</p>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => navigate(`/movies/${movie.id}`, { state: { from: location } })}
                      className="flex-1 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-100"
                    >
                      詳細を見る
                    </button>
                    <button
                      onClick={() => void handleRemove(movie.id)}
                      disabled={removingMovieId === movie.id}
                      className="flex-1 rounded-lg bg-gray-700 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-600 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {removingMovieId === movie.id ? '更新中...' : '外す'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
