import React, { useState, useEffect } from 'react';
import { Mail, Lock, ArrowRight, UserPlus, ArrowLeft, LogOut, Library, Search, Play, Plus, Star, Clock, ShoppingCart } from 'lucide-react';
import { BrowserRouter as Router, Route, Routes, Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { supabase } from './lib/supabase';

// 仮の作品データ
const MOCK_MOVIES = [
  {
    id: 1,
    title: "インセプション",
    releaseDate: "2024-03-01",
    thumbnail: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800&auto=format&fit=crop",
    description: "夢の中で情報を盗む特殊な技術を持つ男が、今度は逆に思考を植え付ける危険なミッションに挑む。",
    duration: "2時間28分",
    rating: 4.8,
    genre: ["アクション", "SF", "サスペンス"],
    cast: ["レオナルド・ディカプリオ", "渡辺謙", "エレン・ペイジ"],
    director: "クリストファー・ノーラン",
    releaseYear: 2010,
  },
  {
    id: 2,
    title: "アバター",
    releaseDate: "2024-02-15",
    thumbnail: "https://images.unsplash.com/photo-1518709766631-a6a7f45921c3?w=800&auto=format&fit=crop",
    description: "人類が新たな惑星を開拓しようとする中、原住民との間で繰り広げられる壮大な物語。",
    duration: "2時間42分",
    rating: 4.7,
    genre: ["SF", "アドベンチャー", "アクション"],
    cast: ["サム・ワーシントン", "ゾーイ・サルダナ", "シガーニー・ウィーバー"],
    director: "ジェームズ・キャメロン",
    releaseYear: 2009,
  },
  {
    id: 3,
    title: "マトリックス",
    releaseDate: "2024-01-30",
    thumbnail: "https://images.unsplash.com/photo-1626814026160-2237a95fc5a0?w=800&auto=format&fit=crop",
    description: "仮想現実の世界で人類が機械に支配されている未来。真実を知った男が人類を解放するために立ち上がる。",
    duration: "2時間16分",
    rating: 4.9,
    genre: ["SF", "アクション"],
    cast: ["キアヌ・リーブス", "ローレンス・フィッシュバーン", "キャリー＝アン・モス"],
    director: "ウォシャウスキー姉弟",
    releaseYear: 1999,
  },
  {
    id: 4,
    title: "インターステラー",
    releaseDate: "2024-01-15",
    thumbnail: "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=800&auto=format&fit=crop",
    description: "地球の危機を救うため、宇宙飛行士たちが未知の惑星を探索する壮大な宇宙冒険。",
    duration: "2時間49分",
    rating: 4.8,
    genre: ["SF", "ドラマ", "アドベンチャー"],
    cast: ["マシュー・マコノヒー", "アン・ハサウェイ", "ジェシカ・チャステイン"],
    director: "クリストファー・ノーラン",
    releaseYear: 2014,
  },
  {
    id: 5,
    title: "ブレードランナー",
    releaseDate: "2023-12-25",
    thumbnail: "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=800&auto=format&fit=crop",
    description: "人工知能が発達した未来。人造人間を追う刑事の活躍を描くSFアクション。",
    duration: "1時間57分",
    rating: 4.7,
    genre: ["SF", "アクション", "サイバーパンク"],
    cast: ["ハリソン・フォード", "ルトガー・ハウアー", "ショーン・ヤング"],
    director: "リドリー・スコット",
    releaseYear: 1982,
  },
];

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      navigate('/movies');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ログインに失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800">
      <div className="w-full max-w-md">
        {/* Logo Section */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">VODサービス</h1>
          <p className="text-gray-400">お気に入りの映画をいつでも、どこでも</p>
        </div>

        {/* Login Form */}
        <div className="bg-white rounded-lg shadow-xl p-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-6">ログイン</h2>
          
          {error && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Input */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                メールアドレス
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="your@email.com"
                  required
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                パスワード
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            {/* Forgot Password Link */}
            <div className="flex items-center justify-end">
              <Link to="/password-reset" className="text-sm text-indigo-600 hover:text-indigo-500">
                パスワードをお忘れの方はこちら
              </Link>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  ログイン
                  <ArrowRight className="ml-2 h-5 w-5" />
                </>
              )}
            </button>

            {/* Sign Up Button */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">または</span>
              </div>
            </div>

            <Link
              to="/signup"
              className="w-full flex items-center justify-center py-2 px-4 border-2 border-gray-300 rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <UserPlus className="h-5 w-5 mr-2" />
              新規アカウント作成
            </Link>
          </form>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-400">
            © 2025 VODサービス. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}

function SignUpPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('パスワードが一致しません');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) throw error;

      // 成功したらトップページに遷移
      navigate('/movies');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'アカウント作成に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800">
      <div className="w-full max-w-md">
        {/* Logo Section */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">VODサービス</h1>
          <p className="text-gray-400">お気に入りの映画をいつでも、どこでも</p>
        </div>

        {/* Sign Up Form */}
        <div className="bg-white rounded-lg shadow-xl p-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-6">新規アカウント作成</h2>
          
          {error && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Input */}
            <div>
              <label htmlFor="signup-email" className="block text-sm font-medium text-gray-700 mb-1">
                メールアドレス
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="signup-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="your@email.com"
                  required
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <label htmlFor="signup-password" className="block text-sm font-medium text-gray-700 mb-1">
                パスワード
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="signup-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="••••••••"
                  required
                  minLength={8}
                />
              </div>
              <p className="mt-1 text-sm text-gray-500">8文字以上で入力してください</p>
            </div>

            {/* Confirm Password Input */}
            <div>
              <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 mb-1">
                パスワード（確認）
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="••••••••"
                  required
                  minLength={8}
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  アカウントを作成
                  <ArrowRight className="ml-2 h-5 w-5" />
                </>
              )}
            </button>

            <div className="text-center">
              <Link to="/" className="text-sm text-indigo-600 hover:text-indigo-500">
                ログイン画面に戻る
              </Link>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-400">
            © 2025 VODサービス. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}

function PasswordResetPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // TODO: Implement actual password reset logic
    setTimeout(() => {
      setIsLoading(false);
      setIsSubmitted(true);
    }, 1000);
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800">
        <div className="w-full max-w-md">
          {/* Logo Section */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">VODサービス</h1>
            <p className="text-gray-400">お気に入りの映画をいつでも、どこでも</p>
          </div>

          {/* Success Message */}
          <div className="bg-white rounded-lg shadow-xl p-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">メールを送信しました</h2>
            <p className="text-gray-600 mb-6">
              パスワードリセットのためのリンクを、入力されたメールアドレスに送信しました。
              メールの指示に従って、パスワードの再設定を行ってください。
            </p>
            <Link
              to="/"
              className="w-full flex items-center justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              ログイン画面に戻る
            </Link>
          </div>

          {/* Footer */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-400">
              © 2025 VODサービス. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800">
      <div className="w-full max-w-md">
        {/* Logo Section */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">VODサービス</h1>
          <p className="text-gray-400">お気に入りの映画をいつでも、どこでも</p>
        </div>

        {/* Password Reset Form */}
        <div className="bg-white rounded-lg shadow-xl p-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-6">パスワードをリセット</h2>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="reset-email" className="block text-sm font-medium text-gray-700 mb-1">
                メールアドレス
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="reset-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="your@email.com"
                  required
                />
              </div>
              <p className="mt-2 text-sm text-gray-500">
                ご登録のメールアドレスを入力してください。パスワードリセットのためのリンクをお送りします。
              </p>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                'リセットリンクを送信'
              )}
            </button>

            <div className="text-center">
              <Link to="/" className="text-sm text-indigo-600 hover:text-indigo-500">
                ログイン画面に戻る
              </Link>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-400">
            © 2025 VODサービス. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}

function MovieDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const movie = MOCK_MOVIES.find(m => m.id === Number(id));
  const [isPurchased, setIsPurchased] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkPurchaseStatus = async () => {
      try {
        const { data: purchases, error } = await supabase
          .from('purchases')
          .select('*')
          .eq('movie_id', id)
          .single();

        if (error) {
          console.error('Purchase check error:', error);
          return;
        }

        setIsPurchased(!!purchases);
      } catch (err) {
        console.error('Error checking purchase status:', err);
      } finally {
        setIsLoading(false);
      }
    };

    checkPurchaseStatus();
  }, [id]);

  const handlePurchase = async () => {
    try {
      setIsLoading(true);
      const { error } = await supabase
        .from('purchases')
        .insert([
          { movie_id: Number(id) }
        ]);

      if (error) throw error;

      setIsPurchased(true);
    } catch (err) {
      console.error('Purchase error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!movie) {
    return <Navigate to="/movies" />;
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Hero Section */}
      <div className="relative h-[70vh]">
        <img
          src={movie.thumbnail}
          alt={movie.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/80 to-transparent">
          <div className="absolute bottom-0 left-0 p-8 container mx-auto">
            <div className="max-w-4xl">
              <h1 className="text-5xl font-bold text-white mb-4">{movie.title}</h1>
              <div className="flex items-center space-x-4 text-gray-300 mb-6">
                <span>{movie.releaseYear}</span>
                <span>•</span>
                <span>{movie.duration}</span>
                <span>•</span>
                <div className="flex items-center">
                  <Star className="h-4 w-4 text-yellow-400 mr-1" />
                  <span>{movie.rating}</span>
                </div>
              </div>
              <div className="flex space-x-4 mb-8">
                <button
                  onClick={isPurchased ? () => {} : handlePurchase}
                  disabled={isLoading}
                  className={`flex items-center px-8 py-3 rounded-lg font-semibold transition ${
                    isPurchased
                      ? 'bg-white text-gray-900 hover:bg-gray-100'
                      : 'bg-indigo-600 text-white hover:bg-indigo-700'
                  }`}
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      {isPurchased ? (
                        <>
                          <Play className="h-5 w-5 mr-2" />
                          再生
                        </>
                      ) : (
                        <>
                          <ShoppingCart className="h-5 w-5 mr-2" />
                          購入
                        </>
                      )}
                    </>
                  )}
                </button>
                <button className="flex items-center px-8 py-3 bg-gray-800 text-white rounded-lg font-semibold hover:bg-gray-700 transition">
                  <Plus className="h-5 w-5 mr-2" />
                  マイリストに追加
                </button>
              </div>
              <p className="text-gray-300 text-lg max-w-3xl leading-relaxed">
                {movie.description}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Details Section */}
      <div className="container mx-auto px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {/* Left Column - Movie Details */}
          <div className="md:col-span-2 space-y-8">
            <section>
              <h2 className="text-2xl font-bold text-white mb-4">作品について</h2>
              <p className="text-gray-300 leading-relaxed">
                {movie.description}
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">キャスト</h2>
              <div className="grid grid-cols-2 gap-4">
                {movie.cast.map((actor, index) => (
                  <div key={index} className="text-gray-300">
                    {actor}
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Right Column - Additional Info */}
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">ジャンル</h3>
              <div className="flex flex-wrap gap-2">
                {movie.genre.map((genre, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-gray-800 text-gray-300 rounded-full text-sm"
                  >
                    {genre}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-white mb-2">監督</h3>
              <p className="text-gray-300">{movie.director}</p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-white mb-2">公開年</h3>
              <p className="text-gray-300">{movie.releaseYear}年</p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-white mb-2">再生時間</h3>
              <p className="text-gray-300">{movie.duration}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MovieListPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleMovieClick = (movieId: number) => {
    navigate(`/movies/${movieId}`);
  };

  return (
    <div className=" min-h-screen bg-gray-900">
      {/* Header */}
      <header className="fixed top-0 w-full bg-gray-900/95 backdrop-blur-sm z-50 border-b border-gray-800">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Left side */}
            <div className="flex items-center space-x-8">
              <h1 className="text-2xl font-bold text-white">VODサービス</h1>
              <nav className="hidden md:flex items-center space-x-6">
                <Link to="/movies" className="text-white hover:text-gray-300">
                  ホーム
                </Link>
                <Link to="/library" className="text-gray-400 hover:text-white flex items-center">
                  <Library className="h-4 w-4 mr-1" />
                  マイライブラリ
                </Link>
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

              {/* Logout */}
              <button 
                onClick={handleLogout}
                className="text-gray-400 hover:text-white flex items-center"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 pt-24 pb-12">
        {/* Hero Section */}
        <section className="mb-12">
          <div className="relative h-[60vh] rounded-xl overflow-hidden">
            <img
              src="https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=1920&auto=format&fit=crop"
              alt="Hero"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/50 to-transparent">
              <div className="absolute bottom-0 left-0 p-8">
                <h2 className="text-4xl font-bold text-white mb-4">インセプション</h2>
                <p className="text-gray-200 text-lg mb-6 max-w-2xl">
                  夢の中で情報を盗む特殊な技術を持つ男が、今度は逆に思考を植え付ける危険なミッションに挑む。
                </p>
                <button className="bg-white text-gray-900 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition">
                  今すぐ視聴
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* New Releases */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-6">新着作品</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {MOCK_MOVIES.map((movie) => (
              <div
                key={movie.id}
                className="group relative rounded-lg overflow-hidden transition-transform duration-300 hover:scale-105 cursor-pointer"
                onClick={() => handleMovieClick(movie.id)}
              >
                <img
                  src={movie.thumbnail}
                  alt={movie.title}
                  className="w-full aspect-[2/3] object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="absolute bottom-0 left-0 p-4">
                    <h3 className="text-white font-semibold mb-1">{movie.title}</h3>
                    <p className="text-gray-300 text-sm">{movie.releaseDate}</p>
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
            {MOCK_MOVIES.slice().reverse().map((movie) => (
              <div
                key={movie.id}
                className="group relative rounded-lg overflow-hidden transition-transform duration-300 hover:scale-105 cursor-pointer"
                onClick={() => handleMovieClick(movie.id)}
              >
                <img
                  src={movie.thumbnail}
                  alt={movie.title}
                  className="w-full aspect-[2/3] object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="absolute bottom-0 left-0 p-4">
                    <h3 className="text-white font-semibold mb-1">{movie.title}</h3>
                    <p className="text-gray-300 text-sm">{movie.releaseDate}</p>
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
        <Route path="/" element={<LoginPage />} />
        <Route path="/signup" element={<SignUpPage />} />
        <Route path="/password-reset" element={<PasswordResetPage />} />
        <Route path="/movies" element={<MovieListPage />} />
        <Route path="/movies/:id" element={<MovieDetailPage />} />
      </Routes>
    </Router>
  );
}

export default App;