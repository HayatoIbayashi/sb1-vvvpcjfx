import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from 'react-router-dom';
import { Search, Library, LogOut, LogIn } from 'lucide-react';
import { supabase } from './lib/supabase';
import type { Database } from './lib/types';

type Movie = Database['public']['Tables']['movies']['Row'];

// Mock data for testing
const MOCK_MOVIES: Movie[] = [
  {
    id: '1',
    title: 'インセプション',
    description: '夢の中に入り込み、他人の心から情報を盗み出す特殊な技術を持つプロフェッショナル・チームの物語。今回の任務は、逆に他人の心に思考を植え付けること。',
    thumbnail: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&q=80&w=800',
    release_date: '2010-07-16',
    duration: '2時間28分',
    rating: 8.8,
    genre: ['アクション', 'SF', 'サスペンス'],
    cast: ['レオナルド・ディカプリオ', 'エレン・ペイジ', '渡辺謙'],
    director: 'クリストファー・ノーラン',
    release_year: 2010,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: '2',
    title: '千と千尋の神隠し',
    description: '両親と共に引っ越し先への途中、不思議な町へ迷い込んでしまった少女・千尋が、魔法の世界で繰り広げる冒険を描いたアニメーション映画。',
    thumbnail: 'https://images.unsplash.com/photo-1608346128025-1896b97a6fa7?auto=format&fit=crop&q=80&w=800',
    release_date: '2001-07-20',
    duration: '2時間5分',
    rating: 9.0,
    genre: ['アニメーション', 'ファンタジー', 'アドベンチャー'],
    cast: ['柊瑠美', '入野自由', '夏木マリ'],
    director: '宮崎駿',
    release_year: 2001,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: '3',
    title: 'マトリックス',
    description: 'コンピュータプログラマーのネオが、現実世界が人工知能によって作られた仮想現実であることを知り、人類を解放するための戦いに身を投じる。',
    thumbnail: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&q=80&w=800',
    release_date: '1999-03-31',
    duration: '2時間16分',
    rating: 8.7,
    genre: ['アクション', 'SF'],
    cast: ['キアヌ・リーブス', 'ローレンス・フィッシュバーン', 'キャリー＝アン・モス'],
    director: 'ウォシャウスキー姉弟',
    release_year: 1999,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      navigate('/');
    } catch (error) {
      setError('ログインに失敗しました。');
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="bg-gray-800 p-8 rounded-lg shadow-lg w-96">
        <h1 className="text-2xl font-bold text-white mb-6">ログイン</h1>
        {error && <p className="text-red-500 mb-4">{error}</p>}
        <form onSubmit={handleLogin}>
          <div className="mb-4">
            <label className="block text-gray-300 mb-2" htmlFor="email">
              メールアドレス
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 bg-gray-700 text-white rounded"
              required
            />
          </div>
          <div className="mb-6">
            <label className="block text-gray-300 mb-2" htmlFor="password">
              パスワード
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 bg-gray-700 text-white rounded"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 rounded font-semibold hover:bg-blue-700"
          >
            ログイン
          </button>
        </form>
        <div className="mt-4 text-center">
          <Link to="/signup" className="text-blue-400 hover:text-blue-300">
            アカウントを作成
          </Link>
          <span className="text-gray-500 mx-2">|</span>
          <Link to="/password-reset" className="text-blue-400 hover:text-blue-300">
            パスワードを忘れた方
          </Link>
        </div>
      </div>
    </div>
  );
}

function SignUpPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      navigate('/');
    } catch (error) {
      setError('サインアップに失敗しました。');
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="bg-gray-800 p-8 rounded-lg shadow-lg w-96">
        <h1 className="text-2xl font-bold text-white mb-6">アカウント作成</h1>
        {error && <p className="text-red-500 mb-4">{error}</p>}
        <form onSubmit={handleSignUp}>
          <div className="mb-4">
            <label className="block text-gray-300 mb-2" htmlFor="email">
              メールアドレス
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 bg-gray-700 text-white rounded"
              required
            />
          </div>
          <div className="mb-6">
            <label className="block text-gray-300 mb-2" htmlFor="password">
              パスワード
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 bg-gray-700 text-white rounded"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 rounded font-semibold hover:bg-blue-700"
          >
            アカウントを作成
          </button>
        </form>
        <div className="mt-4 text-center">
          <Link to="/login" className="text-blue-400 hover:text-blue-300">
            ログインページへ戻る
          </Link>
        </div>
      </div>
    </div>
  );
}

function PasswordResetPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) throw error;
      setMessage('パスワードリセットのメールを送信しました。');
    } catch (error) {
      setError('パスワードリセットに失敗しました。');
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="bg-gray-800 p-8 rounded-lg shadow-lg w-96">
        <h1 className="text-2xl font-bold text-white mb-6">パスワードリセット</h1>
        {message && <p className="text-green-500 mb-4">{message}</p>}
        {error && <p className="text-red-500 mb-4">{error}</p>}
        <form onSubmit={handlePasswordReset}>
          <div className="mb-6">
            <label className="block text-gray-300 mb-2" htmlFor="email">
              メールアドレス
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 bg-gray-700 text-white rounded"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 rounded font-semibold hover:bg-blue-700"
          >
            リセットメールを送信
          </button>
        </form>
        <div className="mt-4 text-center">
          <Link to="/login" className="text-blue-400 hover:text-blue-300">
            ログインページへ戻る
          </Link>
        </div>
      </div>
    </div>
  );
}

function MovieDetailPage() {
  const navigate = useNavigate();
  const [movie, setMovie] = useState<Movie | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsAuthenticated(!!session);
    };
    checkAuth();

    // Find movie from mock data instead of fetching from DB
    const movieId = window.location.pathname.split('/').pop();
    const foundMovie = MOCK_MOVIES.find(m => m.id === movieId);
    if (foundMovie) {
      setMovie(foundMovie);
    }
  }, []);

  const handlePurchase = async () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    // Purchase logic implementation
  };

  return (
    <div className="min-h-screen bg-gray-900">
      {movie && (
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row gap-8">
            <div className="md:w-1/3">
              <img
                src={movie.thumbnail || ''}
                alt={movie.title}
                className="w-full rounded-lg shadow-lg"
              />
            </div>
            <div className="md:w-2/3">
              <h1 className="text-3xl font-bold text-white mb-4">{movie.title}</h1>
              <p className="text-gray-300 mb-6">{movie.description}</p>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <h3 className="text-gray-400 font-semibold">公開日</h3>
                  <p className="text-white">{movie.release_date}</p>
                </div>
                <div>
                  <h3 className="text-gray-400 font-semibold">時間</h3>
                  <p className="text-white">{movie.duration}</p>
                </div>
                <div>
                  <h3 className="text-gray-400 font-semibold">監督</h3>
                  <p className="text-white">{movie.director}</p>
                </div>
                <div>
                  <h3 className="text-gray-400 font-semibold">評価</h3>
                  <p className="text-white">{movie.rating}/10</p>
                </div>
              </div>
              <button
                onClick={handlePurchase}
                className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
              >
                {isAuthenticated ? '購入する' : 'ログインして購入'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MovieListPage() {
  const navigate = useNavigate();
  const [movies, setMovies] = useState<Movie[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsAuthenticated(false);
  };

  const handleLogin = () => {
    navigate('/login');
  };

  const handleMovieClick = (movieId: string) => {
    navigate(`/movies/${movieId}`);
  };

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsAuthenticated(!!session);
    };
    checkAuth();

    // Use mock data instead of fetching from DB
    setMovies(MOCK_MOVIES);
  }, []);

  const filteredMovies = movies.filter(movie =>
    movie.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (movie.description?.toLowerCase() || '').includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="fixed top-0 w-full bg-gray-900/95 backdrop-blur-sm z-50 border-b border-gray-800">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            {/* Left side */}
            <div className="flex items-center space-x-8">
              <h1 className="text-2xl font-bold text-white">VODサービス</h1>
              <nav className="hidden md:flex space-x-6">
                <Link to="/" className="text-white hover:text-gray-300">
                  ホーム
                </Link>
                {isAuthenticated && (
                  <Link to="/library" className="text-gray-400 hover:text-white flex items-center">
                    <Library className="h-4 w-4 mr-1" />
                    マイライブラリ
                  </Link>
                )}
              </nav>
            </div>

            {/* Right side */}
            <div className="flex items-center space-x-6">
              {/* Search */}
              <div className="relative hidden md:block">
                <input
                  type="text"
                  placeholder="作品を検索..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-64 px-4 py-1 pl-10 bg-gray-800 text-white rounded-full border border-gray-700 focus:outline-none focus:border-gray-500"
                />
                <Search className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              </div>

              {/* Auth Button */}
              {isAuthenticated ? (
                <button 
                  onClick={handleLogout}
                  className="text-gray-400 hover:text-white flex items-center"
                >
                  <LogOut className="h-5 w-5" />
                </button>
              ) : (
                <button 
                  onClick={handleLogin}
                  className="text-gray-400 hover:text-white flex items-center gap-2"
                >
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
              <img
                src={movies[0].thumbnail || ''}
                alt={movies[0].title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/50 to-transparent">
                <div className="absolute bottom-0 left-0 p-8">
                  <h2 className="text-4xl font-bold text-white mb-4">{movies[0].title}</h2>
                  <p className="text-gray-200 text-lg mb-6 max-w-2xl">
                    {movies[0].description}
                  </p>
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

        {/* New Releases */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-6">新着作品</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {filteredMovies.map((movie) => (
              <div
                key={movie.id}
                className="group relative rounded-lg overflow-hidden transition-transform duration-300 hover:scale-105 cursor-pointer"
                onClick={() => handleMovieClick(movie.id)}
              >
                <img
                  src={movie.thumbnail || ''}
                  alt={movie.title}
                  className="w-full aspect-[2/3] object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="absolute bottom-0 left-0 p-4">
                    <h3 className="text-white font-semibold mb-1">{movie.title}</h3>
                    <p className="text-gray-300 text-sm">{movie.release_date}</p>
                    <p className="text-gray-400 text-sm mt-2 line-clamp-2">
                      {movie.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Popular Movies */}
        <section>
          <h2 className="text-2xl font-bold text-white mb-6">人気の作品</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {filteredMovies.slice().reverse().map((movie) => (
              <div
                key={movie.id}
                className="group relative rounded-lg overflow-hidden transition-transform duration-300 hover:scale-105 cursor-pointer"
                onClick={() => handleMovieClick(movie.id)}
              >
                <img
                  src={movie.thumbnail || ''}
                  alt={movie.title}
                  className="w-full aspect-[2/3] object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="absolute bottom-0 left-0 p-4">
                    <h3 className="text-white font-semibold mb-1">{movie.title}</h3>
                    <p className="text-gray-300 text-sm">{movie.release_date}</p>
                    <p className="text-gray-400 text-sm mt-2 line-clamp-2">
                      {movie.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 border-t border-gray-800">
        <div className="container mx-auto px-4 py-8">
          <p className="text-center text-gray-400">
            © 2025 VODサービス. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<MovieListPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignUpPage />} />
        <Route path="/password-reset" element={<PasswordResetPage />} />
        <Route path="/movies/:id" element={<MovieDetailPage />} />
      </Routes>
    </Router>
  );
}

export default App;