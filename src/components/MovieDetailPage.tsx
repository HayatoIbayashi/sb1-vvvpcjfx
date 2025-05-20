import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { stripePromise } from '../lib/stripe';
import { Header } from './common/Header';
import { loadStripe } from '@stripe/stripe-js';
import type { Database } from '../lib/types';
import { MOCK_MOVIES } from '../mockData';

type Movie = Database['public']['Tables']['movies']['Row'];

function MovieDetailPage() {
    const navigate = useNavigate();
    const [movie, setMovie] = useState<Movie | null>(null);
    const [paymentSuccess, setPaymentSuccess] = useState(false);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    useEffect(() => {
        // 初期ロード時にlocalStorageから認証状態をチェック
        const storedTokens = localStorage.getItem('cognito_tokens');
        setIsAuthenticated(!!storedTokens);
    }, []);
    const movieId = window.location.pathname.split('/').pop();

    useEffect(() => {
        // Check URL for payment success
        const queryParams = new URLSearchParams(window.location.search);
        if (queryParams.get('payment_success') === 'true') {
            setPaymentSuccess(true);
        }

        // Find movie from mock data instead of fetching from DB
        const foundMovie = MOCK_MOVIES.find(m => m.id === movieId);
        if (foundMovie) {
            setMovie(foundMovie);
        }
    }, []);

    const handlePurchase = async (event: React.MouseEvent, isRental = false) => {
        if (!isAuthenticated) {
            navigate('/login');
            return;
        }

        if (!movie || !movieId) return;

        try {
            const res = await fetch('https://nsrcamrusc.execute-api.ap-northeast-1.amazonaws.com/dev/CreateCheckout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    priceId: isRental ? 'price_1RQjIPKxyMynMg1MBNl3glQp' : 'price_1RCA0wKxyMynMg1Mo5jsYBMJ',
                    contentsId: movieId,
                    productId: isRental ? 'prod_S6MkShXbOAI54P' : 'prod_SLQ8ucdYOansfn'
                })
            });

            const { sessionId } = await res.json();
            const stripe = await loadStripe("pk_test_51QsGlSKxyMynMg1MBIwFvSLHkeiaN0hwuTdPD98lUzeNKeYIyTLuXmIBuMCYiinUS8QQ0gX4dwNOPmZnphGLZUmx00FeCfTtLb");
            if (!stripe) {
                throw new Error('Stripe failed to load');
            }

            const error = await stripe.redirectToCheckout({ sessionId });
            if (error) {
                throw error;
            }
        } catch (error) {
            console.error('Payment error:', error);
            alert('決済処理中にエラーが発生しました');
        }
    };

    const handleRental = (event: React.MouseEvent) => handlePurchase(event, true);

    const handleBack = () => {
        navigate(`/movies/${movie?.id}`);
    };

    const handleLogin = () => navigate('/login');
    const handleLogout = () => {
        localStorage.removeItem('cognito_tokens');
        setIsAuthenticated(false);
        window.location.reload();
    };

    return (
        <div className="min-h-screen bg-gray-900">
            <Header
                isAuthenticated={isAuthenticated}
                onLogin={handleLogin}
                onLogout={handleLogout}
                searchQuery=""
                onSearchChange={() => {}}
            />
            {movie && (
                <div className="container mx-auto px-4 pt-24 pb-8">
                    <div className="flex flex-col md:flex-row gap-8">
                        <div className="md:w-1/3">
                            <img
                                src={movie.thumbnail_detail || ''}
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
                            </div>
                            {paymentSuccess ? (
                                <div className="space-y-4">
                                    <div className="mt-4 p-4 bg-green-100 text-green-800 rounded">
                                        決済が完了しました！
                                    </div>
                                    <button
                                        onClick={handleBack}
                                        className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
                                    >
                                        作品詳細ページに戻る
                                    </button>
                                </div>
                            ) : (
                                <div className="flex flex-wrap gap-4">
                                    <button
                                        onClick={(e) => handlePurchase(e, false)}
                                        className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-3 rounded-lg font-semibold transition flex-1 min-w-[200px]"
                                    >
                                        <div>{isAuthenticated ? '購入する' : 'ログインして購入'}</div>
                                        <div className="text-sm font-normal">
                                            {movie?.price ? `¥${movie.price.toLocaleString()}` : '価格未設定'}
                                        </div>
                                    </button>
                                    <button
                                        onClick={handleRental}
                                        className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-3 rounded-lg font-semibold transition flex-1 min-w-[200px]"
                                    >
                                        <div>{isAuthenticated ? 'レンタルする' : 'ログインしてレンタル'}</div>
                                        <div className="text-sm font-normal">
                                            {movie?.rental_price ? `¥${movie.rental_price.toLocaleString()}` : '価格未設定'}
                                        </div>
                                    </button>
                                    <Link
                                        to="/subscription"
                                        className="bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-lg font-semibold transition flex-1 min-w-[200px] text-center"
                                    >
                                        メンバーシップ登録
                                    </Link>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default MovieDetailPage;
