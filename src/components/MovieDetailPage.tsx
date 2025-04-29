import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from 'react-oidc-context';
import { stripePromise } from '../lib/stripe';
import { loadStripe } from '@stripe/stripe-js';
import type { Database } from '../lib/types';
import { MOCK_MOVIES } from '../mockData';

type Movie = Database['public']['Tables']['movies']['Row'];

function MovieDetailPage() {
    const navigate = useNavigate();
    const [movie, setMovie] = useState<Movie | null>(null);
    const [paymentSuccess, setPaymentSuccess] = useState(false);
    const auth = useAuth();
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

    const handlePurchase = async () => {
        if (!auth.isAuthenticated) {
            await auth.signinRedirect();
            return;
        }

        if (!movie) return;

        try {
            const res = await fetch('https://nsrcamrusc.execute-api.ap-northeast-1.amazonaws.com/dev/CreateCheckout', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  priceId: 'price_1RCA0wKxyMynMg1Mo5jsYBMJ',
                  contentsId: movieId
                })
              });

              const { sessionId } = await res.json();
              const stripe = await loadStripe("pk_test_51QsGlSKxyMynMg1MBIwFvSLHkeiaN0hwuTdPD98lUzeNKeYIyTLuXmIBuMCYiinUS8QQ0gX4dwNOPmZnphGLZUmx00FeCfTtLb");
              if (!stripe) {
                  throw new Error('Stripe failed to load');
              }

              const error = await stripe.redirectToCheckout({ sessionId });
              console.log("redirect result:", error);
              if (error) {
                throw error;
            }
        } catch (error) {
            console.error('Payment error:', error);
            alert('決済処理中にエラーが発生しました');
        }
    };

    const handleBack = () => {
        navigate(`/movies/${movie?.id}`);
    };

    return (
        <div className="min-h-screen bg-gray-900">
            {movie && (
                <div className="container mx-auto px-4 py-8">
                    <button
                        onClick={() => navigate('/')}
                        className="mb-6 bg-gray-700 text-white px-4 py-2 rounded-lg font-semibold hover:bg-gray-600 transition"
                    >
                        作品一覧に戻る
                    </button>
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
                                <button
                                    onClick={handlePurchase}
                                    className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
                                >
                                    {auth.isAuthenticated ? '購入する' : 'ログインして購入'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default MovieDetailPage;

