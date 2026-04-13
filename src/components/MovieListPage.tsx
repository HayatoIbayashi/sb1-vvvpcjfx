import { useState, useEffect, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, LogOut, LogIn } from 'lucide-react';
import type { Database } from '../lib/types';
import { MOCK_MOVIES } from '../mockData';
import useApiClient from '../lib/useApiClient';
import * as mockReviews from '../lib/mockReviews';
import { useAuthStatus } from '../lib/authBridge';
import { HOME_DISPLAY_SAMPLES } from './homeDisplaySamples';

type Movie = Database['public']['Tables']['movies']['Row'];

function MovieListPage() {
  const navigate = useNavigate();
  const [movies, setMovies] = useState<Movie[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const { isAuthenticated, logoutAll } = useAuthStatus();
  const api = useApiClient();
  const useMockMovies = import.meta.env.VITE_USE_MOCK_MOVIES === 'true';
  const [ratingMap, setRatingMap] = useState<Record<string, number>>({});
  const [topRated, setTopRated] = useState<Movie[]>([]);

  const handleLogout = async () => {
    logoutAll();
  };

  const handleLogin = async () => {
    navigate('/login');
  };

  const handleMovieClick = (movieId: string) => {
    navigate(`/movies/${movieId}`);
  };

  const handleSearchSubmit = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = searchQuery.trim();
    if (!trimmed) return;
    navigate(`/search?q=${encodeURIComponent(trimmed)}`);
  };

  // 作品一覧を取得（モック優先、失敗時はモックにフォールバック）
  useEffect(() => {
    let cancelled = false;
    const loadMovies = async () => {
      if (useMockMovies) {
        if (!cancelled) setMovies(MOCK_MOVIES);
        return;
      }
      try {
        const res = await api.getMovies();
        if (!cancelled) setMovies(res.items);
      } catch (error) {
        console.error('Error fetching movies:', error);
        if (!cancelled) setMovies(MOCK_MOVIES);
      }
    };
    loadMovies();
    return () => {
      cancelled = true;
    };
  }, [api, useMockMovies]);

  // 各作品の平均評価を取得して「高評価作品」を作成
  useEffect(() => {
    let cancelled = false;
    const useMock = import.meta.env.VITE_USE_MOCK_REVIEWS === 'true';
    async function loadRatings() {
      if (!movies.length) {
        if (!cancelled) {
          setRatingMap({});
          setTopRated([]);
        }
        return;
      }
      try {
        const results = await Promise.all(
          movies.map(async (m) => {
            try {
              const items = useMock
                ? await mockReviews.getReviews(m.id)
                : (await api.getReviews(m.id)).items;
              const avg = items.length ? items.reduce((s, r) => s + r.rating, 0) / items.length : 0;
              return [m.id, avg] as [string, number];
            } catch {
              return [m.id, 0] as [string, number];
            }
          })
        );
        if (cancelled) return;
        const map: Record<string, number> = {};
        for (const [id, avg] of results) map[id] = avg;
        const sorted = movies
          .slice()
          .sort((a, b) => (map[b.id] ?? 0) - (map[a.id] ?? 0))
          .filter((m) => (map[m.id] ?? 0) > 0)
          .slice(0, 10);
        setRatingMap(map);
        setTopRated(sorted);
      } catch {
        if (!cancelled) {
          setRatingMap({});
          setTopRated([]);
        }
      }
    }
    loadRatings();
    return () => {
      cancelled = true;
    };
  }, [movies, api]);

  const displayMovies = movies;

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="fixed top-0 w-full bg-gray-900/95 backdrop-blur-sm z-50 border-b border-gray-800">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            {/* Left side */}
            <div className="flex items-center space-x-8">
              <h1 className="text-2xl font-bold text-white">
                <img
                  src="https://sb1-vvvpcjfx-assets.s3.ap-northeast-1.amazonaws.com/assets/WiiBER_logo.png"
                  alt="WiiBER"
                  className="h-8 cursor-pointer"
                  onClick={() => navigate('/')}
                />
              </h1>
              <nav className="hidden md:flex space-x-6">
                <Link to="/" className="text-white hover:text-gray-300">
                  ホーム
                </Link>
              </nav>
              {/* Subscription Button */}
              <Link
                to="/subscription"
                className="bg-primary text-white px-4 py-2 rounded-lg font-semibold hover:bg-primary/90 transition hidden md:block"
              >
                メンバーシップ
              </Link>
            </div>

            {/* Right side */}
            <div className="flex items-center space-x-8">
              {/* Search */}
              <form className="relative hidden md:block" onSubmit={handleSearchSubmit}>
                <input
                  type="text"
                  placeholder="作品を検索..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-80 md:w-96 px-4 py-2 pl-10 bg-gray-800 text-white rounded-full border border-gray-700 focus:outline-none focus:border-gray-500"
                />
                <button
                  type="submit"
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-200"
                  aria-label="検索"
                >
                  <Search className="h-4 w-4" />
                </button>
              </form>

              {/* Auth Button */}
              {isAuthenticated ? (
                <div className="flex items-center gap-4">
                  <Link to="/account" className="text-gray-300 hover:text-white px-3 py-1.5 rounded-md hover:bg-gray-800/60">設定</Link>
                  <button onClick={handleLogout} className="text-gray-300 hover:text-white flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-gray-800/60">
                    <LogOut className="h-5 w-5" />
                    <span>ログアウト</span>
                  </button>
                </div>
              ) : (
                <button onClick={handleLogin} className="text-gray-300 hover:text-white flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-gray-800/60">
                  <LogIn className="h-5 w-5" />
                  <span>ログイン</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 pt-24 pb-12">
        {/* Hero Section */}
        {movies.length > 0 && (
          <section className="mb-12">
            <div className="relative h-[60vh] rounded-xl overflow-hidden">
              <img src={movies[0].thumbnail_top || ''} alt={movies[0].title} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/50 to-transparent">
                <div className="absolute bottom-0 left-0 p-8">
                  <h2 className="text-4xl font-bold text-white mb-4">{movies[0].title}</h2>

                  <button
                    onClick={() => handleMovieClick(movies[0].id)}
                    className="bg-white text-gray-900 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition"
                  >
                    詳細を見る
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* 表示確認用の固定サンプル */}
        <section className="mb-12">
          <div className="flex items-end justify-between gap-4 mb-6">
            <div>
              <h2 className="text-2xl font-bold text-white">表示確認用サンプル</h2>
              <p className="text-gray-400 mt-2">メイン画面でテキストと画像の見え方を確認するための固定表示です。</p>
            </div>
            <span className="rounded-full border border-cyan-400/40 bg-cyan-400/10 px-3 py-1 text-sm text-cyan-200">
              TEST DISPLAY
            </span>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr_1fr] gap-6">
            {HOME_DISPLAY_SAMPLES.map((sample, index) => (
              <article
                key={sample.id}
                className={`overflow-hidden rounded-2xl border border-gray-800 bg-gray-800/70 shadow-lg ${
                  index === 0 ? 'lg:row-span-2' : ''
                }`}
              >
                <img
                  src={sample.image}
                  alt={sample.title}
                  className={`w-full object-cover ${index === 0 ? 'h-[320px] lg:h-full' : 'h-52'}`}
                />
                <div className="space-y-3 p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.25em] text-cyan-300">
                    {sample.subtitle}
                  </p>
                  <h3 className="text-xl font-bold text-white">{sample.title}</h3>
                  <p className="text-sm leading-6 text-gray-300">{sample.description}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* New Releases */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-6">新着動画</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {displayMovies.map((movie) => (
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
        </section>


        {/* メンバーシップ限定動画（強調レイアウト追加） */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-6">メンバーシップ限定動画</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {displayMovies.slice(0, 10).map((movie) => (
              <div
                key={movie.id}
                className="group relative rounded-lg overflow-hidden ring-2 ring-yellow-500/60 hover:ring-yellow-400 transition cursor-pointer"
                onClick={() => handleMovieClick(movie.id)}
              >
                <img src={movie.thumbnail || ''} alt={movie.title} className="w-full aspect-[2/3] object-cover" />
                <span className="absolute top-2 left-2 bg-yellow-500 text-black text-xs font-bold px-2 py-1 rounded">メンバー限定</span>
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="absolute bottom-0 left-0 p-4">
                    <h3 className="text-white font-semibold mb-1">{movie.title}</h3>
                    <p className="text-gray-300 text-sm">{movie.release_date}</p>
                    <p className="text-gray-400 text-sm mt-2 line-clamp-2">{movie.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
        {/* 好みに合わせた動画 */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-6">あなたの好みに合わせた動画</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {displayMovies.slice(2, 12).map((movie) => (
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
        </section>

        {/* おすすめ動画 */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-6">おすすめ動画</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {displayMovies.slice().reverse().slice(0, 10).map((movie) => (
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
        </section>

        {/* 高評価作品 */}
        {topRated.length > 0 && (
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-white mb-6">高評価作品</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {topRated.map((movie) => (
                <div
                  key={movie.id}
                  className="group relative rounded-lg overflow-hidden transition-transform duration-300 hover:scale-105 cursor-pointer"
                  onClick={() => handleMovieClick(movie.id)}
                >
                  <img src={movie.thumbnail || ''} alt={movie.title} className="w-full aspect-[2/3] object-cover" />
                  <span className="absolute top-2 right-2 bg-black/70 text-yellow-400 text-xs font-bold px-2 py-1 rounded">
                    ★ {(ratingMap[movie.id] ?? 0).toFixed(1)}
                  </span>
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
          </section>
        )}
      </main>
      {/* Footer */}
      <footer className="bg-gray-900 border-t border-gray-800">
        <div className="container mx-auto px-4 py-8">
          <p className="text-center text-gray-400">Copyright WiiBER All Rights Reserved.</p>
        </div>
      </footer>
    </div>
  );
}

export default MovieListPage;





