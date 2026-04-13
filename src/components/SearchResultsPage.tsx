import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { Database } from '../lib/types';
import { MOCK_MOVIES } from '../mockData';
import useApiClient from '../lib/useApiClient';
import { Header } from './common/Header';
import { useAuthStatus } from '../lib/authBridge';

type Movie = Database['public']['Tables']['movies']['Row'];

function matchesQuery(movie: Movie, query: string) {
  const q = query.toLowerCase();
  return movie.title.toLowerCase().includes(q) || (movie.description?.toLowerCase() || '').includes(q);
}

export default function SearchResultsPage() {
  const navigate = useNavigate();
  const api = useApiClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const query = (searchParams.get('q') || '').trim();
  const [searchQuery, setSearchQuery] = useState(query);
  const [movies, setMovies] = useState<Movie[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const useMockMovies = import.meta.env.VITE_USE_MOCK_MOVIES === 'true';
  const { isAuthenticated, logoutAll } = useAuthStatus();

  useEffect(() => {
    setSearchQuery(query);
  }, [query]);

  useEffect(() => {
    let cancelled = false;
    const loadResults = async () => {
      if (!query) {
        setMovies([]);
        setError(null);
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      setError(null);
      try {
        if (useMockMovies) {
          const filtered = MOCK_MOVIES.filter((movie) => matchesQuery(movie, query));
          if (!cancelled) setMovies(filtered);
          return;
        }
        const res = await api.getMovies({ q: query });
        if (!cancelled) setMovies(res.items);
      } catch (err) {
        console.error('Error fetching search results:', err);
        if (!cancelled) setError('検索結果の取得に失敗しました。');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    loadResults();
    return () => {
      cancelled = true;
    };
  }, [api, query, useMockMovies]);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    const trimmed = value.trim();
    const next = new URLSearchParams(searchParams);
    if (trimmed) {
      next.set('q', trimmed);
    } else {
      next.delete('q');
    }
    setSearchParams(next, { replace: true });
  };

  const handleMovieClick = (movieId: string) => {
    navigate(`/movies/${movieId}`);
  };

  return (
    <div className="min-h-screen bg-gray-900">
      <Header
        isAuthenticated={isAuthenticated}
        onLogin={() => navigate('/login')}
        onLogout={logoutAll}
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
      />

      <main className="container mx-auto px-4 pt-24 pb-12">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">検索結果</h1>
          {query && (
            <p className="text-sm text-gray-400 mt-1">
              「{query}」の検索結果: {movies.length} 件
            </p>
          )}
        </div>

        {!query && (
          <div className="text-gray-300">検索キーワードを入力してください。</div>
        )}

        {query && isLoading && (
          <div className="flex justify-center items-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          </div>
        )}

        {query && error && (
          <div className="text-red-400">{error}</div>
        )}

        {query && !isLoading && !error && movies.length === 0 && (
          <div className="text-gray-300">該当する作品が見つかりませんでした。</div>
        )}

        {query && !isLoading && !error && movies.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {movies.map((movie) => (
              <div
                key={movie.id}
                className="group relative rounded-lg overflow-hidden transition-transform duration-300 hover:scale-105 cursor-pointer"
                onClick={() => handleMovieClick(movie.id)}
              >
                <img src={movie.thumbnail || ''} alt={movie.title} className="w-full aspect-[2/3] object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="absolute bottom-0 left-0 p-4">
                    <h3 className="text-white font-semibold mb-1">{movie.title}</h3>
                    <p className="text-gray-300 text-sm">{movie.release_date}</p>
                    <p className="text-gray-400 text-sm mt-2 line-clamp-2">{movie.description}</p>
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
