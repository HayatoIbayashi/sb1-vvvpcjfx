import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { Database } from '../lib/types';
import { MOCK_MOVIES } from '../mockData';
import useApiClient from '../lib/useApiClient';
import { Header } from './common/Header';
import { useAuthStatus } from '../lib/authBridge';
import { getTestMovieThumbnail } from '../lib/testMovieThumbnails';
import { getMovieGenreOptions, getMovieGenres } from '../lib/movieGenres';

type Movie = Database['public']['Tables']['movies']['Row'];

function matchesGenre(movie: Movie, genreName: string) {
  return getMovieGenres(movie).includes(genreName);
}

export default function GenreResultsPage() {
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
    navigate(`/movies/${movieId}`);
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
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {movies.map((movie) => (
              <div
                key={movie.id}
                className="group relative cursor-pointer overflow-hidden rounded-lg transition-transform duration-300 hover:scale-105"
                onClick={() => handleMovieClick(movie.id)}
              >
                <img
                  src={getTestMovieThumbnail(movie, 'card')}
                  alt={movie.title}
                  className="w-full aspect-[2/3] object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                  <div className="absolute bottom-0 left-0 p-4">
                    <h3 className="mb-1 font-semibold text-white">{movie.title}</h3>
                    <p className="text-sm text-gray-300">{movie.release_date}</p>
                    <p className="mt-2 line-clamp-2 text-sm text-gray-400">{movie.description}</p>
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
