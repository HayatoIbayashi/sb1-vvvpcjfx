import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit2, Trash2, Upload, ArrowLeft } from 'lucide-react';
import type { Database } from '../lib/types';

type Movie = Database['public']['Tables']['movies']['Row'];

const MOCK_MOVIES: Movie[] = [
  {
    id: '1',
    title: 'インセプション',
    description: '夢の中で情報を盗む特殊な技術を持つ男が、今度は逆に思考を植え付ける危険なミッションに挑む。',
    thumbnail: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800',
    release_date: '2010-07-16',
    duration: '2時間28分',
    rating: 8.8,
    genre: ['アクション', 'SF', 'サスペンス'],
    cast: ['レオナルド・ディカプリオ', '渡辺謙', 'エレン・ペイジ'],
    director: 'クリストファー・ノーラン',
    release_year: 2010,
    price: 1500,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: '2',
    title: 'アバター',
    description: '人類が新たな惑星を開拓しようとする中、原住民との間で繰り広げられる壮大な物語。',
    thumbnail: 'https://images.unsplash.com/photo-1518709766631-a6a7f45921c3?w=800',
    release_date: '2009-12-18',
    duration: '2時間42分',
    rating: 8.7,
    genre: ['SF', 'アドベンチャー', 'アクション'],
    cast: ['サム・ワーシントン', 'ゾーイ・サルダナ', 'シガーニー・ウィーバー'],
    director: 'ジェームズ・キャメロン',
    release_year: 2009,
    price: 1800,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

export function MovieManagementPage() {
  const navigate = useNavigate();
  const [movies, setMovies] = useState<Movie[]>(MOCK_MOVIES);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    thumbnail: '',
    release_date: '',
    duration: '',
    rating: 0,
    director: '',
    release_year: new Date().getFullYear(),
    price: 0,
    genre: [] as string[],
    cast: [] as string[],
  });

  const handleCreate = async () => {
    try {
      const newMovie: Movie = {
        id: Math.random().toString(36).substr(2, 9),
        ...formData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      setMovies([newMovie, ...movies]);
      setIsModalOpen(false);
      setFormData({
        title: '',
        description: '',
        thumbnail: '',
        release_date: '',
        duration: '',
        rating: 0,
        director: '',
        release_year: new Date().getFullYear(),
        price: 0,
        genre: [],
        cast: [],
      });
    } catch (error) {
      setError('作品の作成に失敗しました');
      console.error('Error creating movie:', error);
    }
  };

  const handleUpdate = async (id: string) => {
    try {
      setMovies(movies.map(movie => 
        movie.id === id 
          ? { ...movie, ...formData, updated_at: new Date().toISOString() }
          : movie
      ));
      
      setIsModalOpen(false);
      setSelectedMovie(null);
    } catch (error) {
      setError('作品の更新に失敗しました');
      console.error('Error updating movie:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('本当にこの作品を削除しますか？')) return;

    try {
      setMovies(movies.filter(movie => movie.id !== id));
    } catch (error) {
      setError('作品の削除に失敗しました');
      console.error('Error deleting movie:', error);
    }
  };

  const openEditModal = (movie: Movie) => {
    setSelectedMovie(movie);
    setFormData({
      title: movie.title,
      description: movie.description || '',
      thumbnail: movie.thumbnail || '',
      release_date: movie.release_date || '',
      duration: movie.duration || '',
      rating: movie.rating || 0,
      director: movie.director || '',
      release_year: movie.release_year || new Date().getFullYear(),
      price: movie.price || 0,
      genre: movie.genre || [],
      cast: movie.cast || [],
    });
    setIsModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-dark">
      {/* Header */}
      <header className="bg-dark-lighter shadow-lg">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/')}
                className="text-gray-400 hover:text-white transition"
              >
                <ArrowLeft className="h-6 w-6" />
              </button>
              <h1 className="text-2xl font-bold text-white">作品管理</h1>
            </div>
            <button
              onClick={() => {
                setSelectedMovie(null);
                setFormData({
                  title: '',
                  description: '',
                  thumbnail: '',
                  release_date: '',
                  duration: '',
                  rating: 0,
                  director: '',
                  release_year: new Date().getFullYear(),
                  price: 0,
                  genre: [],
                  cast: [],
                });
                setIsModalOpen(true);
              }}
              className="flex items-center space-x-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition"
            >
              <Plus className="h-5 w-5" />
              <span>新規作成</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {error && (
          <div className="bg-red-500/10 border border-red-500 text-red-500 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          </div>
        ) : (
          <div className="grid gap-6">
            {movies.map((movie) => (
              <div
                key={movie.id}
                className="bg-dark-lighter rounded-lg shadow-lg overflow-hidden"
              >
                <div className="flex items-start p-6">
                  <img
                    src={movie.thumbnail || 'https://via.placeholder.com/150'}
                    alt={movie.title}
                    className="w-32 h-48 object-cover rounded-lg"
                  />
                  <div className="flex-1 ml-6">
                    <h2 className="text-xl font-bold text-white mb-2">{movie.title}</h2>
                    <p className="text-gray-400 mb-4 line-clamp-2">{movie.description}</p>
                    <div className="grid grid-cols-2 gap-4 text-sm text-gray-300">
                      <div>
                        <span className="text-gray-500">監督:</span> {movie.director}
                      </div>
                      <div>
                        <span className="text-gray-500">公開年:</span> {movie.release_year}
                      </div>
                      <div>
                        <span className="text-gray-500">時間:</span> {movie.duration}
                      </div>
                      <div>
                        <span className="text-gray-500">評価:</span> {movie.rating}/10
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col space-y-2 ml-6">
                    <button
                      onClick={() => openEditModal(movie)}
                      className="flex items-center space-x-2 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition"
                    >
                      <Edit2 className="h-4 w-4" />
                      <span>編集</span>
                    </button>
                    <button
                      onClick={() => handleDelete(movie.id)}
                      className="flex items-center space-x-2 bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span>削除</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-dark-lighter p-8 rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-white mb-6">
              {selectedMovie ? '作品を編集' : '新規作品を作成'}
            </h2>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-gray-300 mb-2">タイトル</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-4 py-2 bg-dark-light text-white rounded"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 mb-2">説明</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-2 bg-dark-light text-white rounded h-32"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 mb-2">サムネイルURL</label>
                  <input
                    type="text"
                    value={formData.thumbnail}
                    onChange={(e) => setFormData({ ...formData, thumbnail: e.target.value })}
                    className="w-full px-4 py-2 bg-dark-light text-white rounded"
                  />
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-gray-300 mb-2">公開日</label>
                  <input
                    type="date"
                    value={formData.release_date}
                    onChange={(e) => setFormData({ ...formData, release_date: e.target.value })}
                    className="w-full px-4 py-2 bg-dark-light text-white rounded"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 mb-2">時間</label>
                  <input
                    type="text"
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                    className="w-full px-4 py-2 bg-dark-light text-white rounded"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 mb-2">評価 (0-10)</label>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    step="0.1"
                    value={formData.rating}
                    onChange={(e) => setFormData({ ...formData, rating: parseFloat(e.target.value) })}
                    className="w-full px-4 py-2 bg-dark-light text-white rounded"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 mb-2">監督</label>
                  <input
                    type="text"
                    value={formData.director}
                    onChange={(e) => setFormData({ ...formData, director: e.target.value })}
                    className="w-full px-4 py-2 bg-dark-light text-white rounded"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 mb-2">公開年</label>
                  <input
                    type="number"
                    value={formData.release_year}
                    onChange={(e) => setFormData({ ...formData, release_year: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 bg-dark-light text-white rounded"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 mb-2">価格 (円)</label>
                  <input
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 bg-dark-light text-white rounded"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end space-x-4 mt-8">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-6 py-2 bg-dark-light text-gray-300 rounded-lg hover:bg-dark transition"
              >
                キャンセル
              </button>
              <button
                onClick={() => selectedMovie ? handleUpdate(selectedMovie.id) : handleCreate()}
                className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition"
              >
                {selectedMovie ? '更新' : '作成'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}