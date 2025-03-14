import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/types';
import { MOCK_MOVIES } from '../mockData';

type Movie = Database['public']['Tables']['movies']['Row'];

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

export default MovieDetailPage;