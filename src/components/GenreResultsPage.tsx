import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import type { Database } from '../lib/types';
import { MOCK_MOVIES } from '../mockData';
import useApiClient from '../lib/useApiClient';
import { Header } from './common/Header';
import { useAuthStatus } from '../lib/authBridge';
import { getTestMovieThumbnail } from '../lib/testMovieThumbnails';
import { getMovieAccessBadgeClass, getMovieAccessTier } from '../lib/movieAccess';
import { getMovieGenreOptions, getMovieGenreSummary, getMovieGenres } from '../lib/movieGenres';

type Movie = Database['public']['Tables']['movies']['Row'];

function matchesGenre(movie: Movie, genreName: string) {
  return getMovieGenres(movie).includes(genreName);
}

export default function GenreResultsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { genreName = '' } = useParams<{ genreName: string }>();
  const api = useApiClient();
  const { isAuthenticated, logoutAll } = useAuthStatus();
  const [movies, setMovies] = useState<Movie[]>([]);
  const [allMovies, setAllMovies] = useState<Movie[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const useMockMovies = import.meta.env.VITE_USE_MOCK_MOVIES === 'true';
  const decodedGenreName = decodeURIComponent(genreName).trim();
  const genreOptions = useMemo(() => getMovieGenreOptions(allMovies), [allMovies]);

  useEffect(() => {
    let cancelled = false;

    const loadResults = async () => {
      if (!decodedGenreName) {
        setMovies([]);
        setAllMovies([]);
        setError(null);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        if (useMockMovies) {
          const filtered = MOCK_MOVIES.filter((movie) => matchesGenre(movie, decodedGenreName));
          if (!cancelled) {
            setAllMovies(MOCK_MOVIES);
            setMovies(filtered);
          }
          return;
        }

        const res = await api.getMovies();
        if (!cancelled) {
          setAllMovies(res.items);
          setMovies(res.items.filter((movie) => matchesGenre(movie, decodedGenreName)));
        }
      } catch (err) {
        console.error('Error fetching genre results:', err);
        if (!cancelled) {
          setError('ジャンル一覧の取得に失敗しました。');
          setMovies([]);
          setAllMovies([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadResults();
    return () => {
      cancelled = true;
    };
  }, [api, decodedGenreName, useMockMovies]);

  const handleMovieClick = (movieId: string) => {
    navigate(`/movies/${movieId}`, { state: { from: location } });
  };

  return (
    <div className="min-h-screen bg-gray-900">
      <Header
        isAuthenticated={isAuthenticated}
        onLogin={() => navigate('/login')}
        onLogout={logoutAll}
        searchQuery=""
        onSearchChange={() => {}}
        genreOptions={genreOptions}
      />

      <main className="container mx-auto px-4 pb-12 pt-24">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">{decodedGenreName || 'ジャンル一覧'}</h1>
          {decodedGenreName && (
            <p className="mt-1 text-sm text-gray-400">
              「{decodedGenreName}」の作品: {movies.length}件
            </p>
          )}
        </div>

        {!decodedGenreName && (
          <div className="text-gray-300">ジャンルが指定されていません。</div>
        )}

        {decodedGenreName && isLoading && (
          <div className="flex h-40 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-white"></div>
          </div>
        )}

        {decodedGenreName && error && <div className="text-red-400">{error}</div>}

        {decodedGenreName && !isLoading && !error && movies.length === 0 && (
          <div className="text-gray-300">このジャンルの作品はまだありません。</div>
        )}

        {decodedGenreName && !isLoading && !error && movies.length > 0 && (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            {movies.map((movie) => (
              <div
                key={movie.id}
                className="cursor-pointer overflow-hidden rounded-2xl border border-gray-800 bg-gray-800/70 shadow-lg transition-transform duration-300 hover:scale-[1.02] hover:border-gray-700"
                onClick={() => handleMovieClick(movie.id)}
              >
                <img
                  src={getTestMovieThumbnail(movie, 'card')}
                  alt={movie.title}
                  className="h-52 w-full object-cover"
                />
                <div className="space-y-3 p-5">
                  <div className="flex flex-wrap items-center gap-3">
                    <span
                      className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${getMovieAccessBadgeClass(getMovieAccessTier(movie))}`}
                    >
                      {getMovieGenreSummary(movie)}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-white">{movie.title}</h3>
                  <p className="line-clamp-3 text-sm leading-6 text-gray-300">{movie.description}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
