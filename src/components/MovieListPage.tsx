import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Library, LogOut, LogIn } from 'lucide-react';
import type { Database } from '../lib/types';
import { MOCK_MOVIES } from '../mockData';

type Movie = Database['public']['Tables']['movies']['Row'];

function MovieListPage() {
    const navigate = useNavigate();
    const [movies, setMovies] = useState<Movie[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    useEffect(() => {
        // 初期ロード時にlocalStorageから認証状態をチェック
        const storedTokens = localStorage.getItem('cognito_tokens');
        setIsAuthenticated(!!storedTokens);
    }, []);

    const handleLogout = async () => {
        localStorage.removeItem('cognito_tokens');
        setIsAuthenticated(false);
        window.location.reload();
    };

    const handleLogin = async () => {
        navigate(`/login`);
    };

    const handleMovieClick = (movieId: string) => {
        navigate(`/movies/${movieId}`);
    };

    useEffect(() => {
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
                <h1 className="text-2xl font-bold text-white">
                    <img src="https://sb1-vvvpcjfx-assets.s3.ap-northeast-1.amazonaws.com/assets/WiiBER_logo.png" alt="WiiBER" className="h-8"
                    onClick={() => navigate('/')}  // Navigate to home on logo click
                    /></h1>
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
                    <span>ログアウト</span>
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
                    src={movies[0].thumbnail_top || ''}
                    alt={movies[0].title}
                    className="w-full h-full object-cover"
                />
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
            <h2 className="text-2xl font-bold text-white mb-6">メンバーシップ限定動画</h2>
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
                Copyright © WiiBER All Rights Reserved.
            </p>
            </div>
        </footer>
        </div>
    );
}

export default MovieListPage;
