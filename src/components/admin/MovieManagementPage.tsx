import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit2, Plus, Trash2 } from 'lucide-react';
import useApiClient from '../../lib/useApiClient';
import { MOCK_MOVIES } from '../../mockData';
import type { Database } from '../../lib/types';
import { getTestMovieThumbnail } from '../../lib/testMovieThumbnails';
import { buildMoviePayload, createEmptyFormData, splitCsv } from './movieManagementForm';

type Movie = Database['public']['Tables']['movies']['Row'];

export default function MovieManagementPage() {
  const navigate = useNavigate();
  const api = useApiClient();
  const useMockMovies = import.meta.env.VITE_USE_MOCK_MOVIES === 'true';

  const [movies, setMovies] = useState<Movie[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [formData, setFormData] = useState<Partial<Movie>>(createEmptyFormData());

  useEffect(() => {
    let cancelled = false;

    const fetchMovies = async () => {
      try {
        setIsLoading(true);
        setError(null);

        if (useMockMovies) {
          await new Promise((resolve) => setTimeout(resolve, 300));
          if (!cancelled) setMovies(MOCK_MOVIES);
          return;
        }

        const res = await api.getAdminMovies();
        if (!cancelled) setMovies(res.items);
      } catch (err) {
        if (!cancelled) setError('作品データの取得に失敗しました');
        console.error('Error fetching movies:', err);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    fetchMovies();
    return () => {
      cancelled = true;
    };
  }, [api, useMockMovies]);

  const filteredMovies = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return movies;

    return movies.filter((movie) => {
      const fields = [
        movie.title || '',
        movie.description || '',
        (movie.genre || []).join(' '),
        (movie.cast || []).join(' '),
      ]
        .join(' ')
        .toLowerCase();
      return fields.includes(normalizedQuery);
    });
  }, [movies, query]);

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedMovie(null);
    setFormData(createEmptyFormData());
  };

  const openCreateModal = () => {
    setError(null);
    setSelectedMovie(null);
    setFormData(createEmptyFormData());
    setIsModalOpen(true);
  };

  const openEditModal = (movie: Movie) => {
    setError(null);
    setSelectedMovie(movie);
    setFormData({
      title: movie.title,
      description: movie.description || '',
      thumbnail: movie.thumbnail || '',
      thumbnail_top: movie.thumbnail_top || '',
      thumbnail_detail: movie.thumbnail_detail || '',
      release_date: movie.release_date || '',
      duration: movie.duration || '',
      genre: movie.genre || [],
      cast: movie.cast || [],
    });
    setIsModalOpen(true);
  };

  const handleCreate = async () => {
    try {
      setError(null);
      if (!formData.title?.trim()) {
        setError('タイトルは必須です');
        return;
      }

      if (!useMockMovies) {
        const createdMovie = await api.createAdminMovie(buildMoviePayload(formData));
        setMovies((prev) => [createdMovie, ...prev]);
        closeModal();
        return;
      }

      const newMovie: Movie = {
        id: Math.random().toString(36).slice(2, 11),
        title: formData.title || '',
        description: formData.description || null,
        thumbnail: formData.thumbnail || null,
        thumbnail_top: formData.thumbnail_top || null,
        thumbnail_detail: formData.thumbnail_detail || null,
        release_date: formData.release_date || null,
        duration: formData.duration || null,
        director: null,
        release_year: null,
        price: 0,
        rental_price: 0,
        genre: formData.genre || [],
        cast: formData.cast || [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      setMovies((prev) => [newMovie, ...prev]);
      closeModal();
    } catch (err) {
      setError('作品の作成に失敗しました');
      console.error('Error creating movie:', err);
    }
  };

  const handleUpdate = async (id: string) => {
    try {
      setError(null);
      if (!formData.title?.trim()) {
        setError('タイトルは必須です');
        return;
      }

      if (!useMockMovies) {
        const updatedMovie = await api.updateAdminMovie(id, buildMoviePayload(formData));
        setMovies((prev) => prev.map((movie) => (movie.id === id ? updatedMovie : movie)));
      } else {
        setMovies((prev) => prev.map((movie) => (
          movie.id === id
            ? { ...movie, ...formData, updated_at: new Date().toISOString() }
            : movie
        )));
      }

      closeModal();
    } catch (err) {
      setError('作品の更新に失敗しました');
      console.error('Error updating movie:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('本当にこの作品を削除しますか？')) return;

    try {
      setError(null);
      if (!useMockMovies) {
        await api.deleteAdminMovie(id);
      }
      setMovies((prev) => prev.filter((movie) => movie.id !== id));
    } catch (err) {
      setError('作品の削除に失敗しました');
      console.error('Error deleting movie:', err);
    }
  };

  return (
    <div className="min-h-screen bg-dark">
      <header className="bg-dark-lighter shadow-lg">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
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
              onClick={openCreateModal}
              className="flex items-center space-x-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition"
            >
              <Plus className="h-5 w-5" />
              <span>新規作成</span>
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {error && (
          <div className="bg-red-500/10 border border-red-500 text-red-500 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        <div className="mb-6">
          <label className="block text-gray-300 mb-2">作品検索</label>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="タイトル・説明・監督・ジャンル・出演者で検索"
            className="w-full px-4 py-2 bg-dark-light text-white rounded border border-transparent focus:border-gray-600 outline-none"
          />
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          </div>
        ) : (
          <div className="grid gap-6">
            {filteredMovies.map((movie) => (
              <div
                key={movie.id}
                className="bg-dark-lighter rounded-lg shadow-lg overflow-hidden"
              >
                <div className="flex items-start p-6 gap-6">
                  <img
                    src={getTestMovieThumbnail(movie, 'card')}
                    alt={movie.title}
                    className="w-32 h-48 object-cover rounded-lg"
                  />
                  <div className="flex-1 min-w-0">
                    <h2 className="text-xl font-bold text-white mb-2">{movie.title}</h2>
                    <p className="text-gray-400 mb-4 line-clamp-2">{movie.description || '説明なし'}</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-300">
                      <div>
                        <span className="text-gray-500">視聴形態:</span> メンバーシップ見放題
                      </div>
                      <div className="md:col-span-2">
                        <span className="text-gray-500">ジャンル:</span> {(movie.genre || []).join(', ') || '-'}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col space-y-2">
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
            {!filteredMovies.length && (
              <div className="text-center text-gray-400 py-12 border border-dashed border-gray-700 rounded-lg">
                該当する作品が見つかりません
              </div>
            )}
          </div>
        )}
      </main>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-lighter p-8 rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-white mb-6">
              {selectedMovie ? '作品を編集' : '新規作品を作成'}
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-gray-300 mb-2">タイトル</label>
                  <input
                    type="text"
                    value={formData.title || ''}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-4 py-2 bg-dark-light text-white rounded"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 mb-2">説明</label>
                  <textarea
                    value={formData.description || ''}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-2 bg-dark-light text-white rounded h-32"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 mb-2">サムネイルURL</label>
                  <input
                    type="text"
                    value={formData.thumbnail || ''}
                    onChange={(e) => setFormData({ ...formData, thumbnail: e.target.value })}
                    className="w-full px-4 py-2 bg-dark-light text-white rounded"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 mb-2">トップ用サムネイルURL</label>
                  <input
                    type="text"
                    value={formData.thumbnail_top || ''}
                    onChange={(e) => setFormData({ ...formData, thumbnail_top: e.target.value })}
                    className="w-full px-4 py-2 bg-dark-light text-white rounded"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 mb-2">詳細用サムネイルURL</label>
                  <input
                    type="text"
                    value={formData.thumbnail_detail || ''}
                    onChange={(e) => setFormData({ ...formData, thumbnail_detail: e.target.value })}
                    className="w-full px-4 py-2 bg-dark-light text-white rounded"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 mb-2">ジャンル（カンマ区切り）</label>
                  <input
                    type="text"
                    value={(formData.genre || []).join(', ')}
                    onChange={(e) => setFormData({ ...formData, genre: splitCsv(e.target.value) })}
                    className="w-full px-4 py-2 bg-dark-light text-white rounded"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 mb-2">出演者（カンマ区切り）</label>
                  <input
                    type="text"
                    value={(formData.cast || []).join(', ')}
                    onChange={(e) => setFormData({ ...formData, cast: splitCsv(e.target.value) })}
                    className="w-full px-4 py-2 bg-dark-light text-white rounded"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-gray-300 mb-2">公開日</label>
                  <input
                    type="date"
                    value={formData.release_date || ''}
                    onChange={(e) => setFormData({ ...formData, release_date: e.target.value })}
                    className="w-full px-4 py-2 bg-dark-light text-white rounded"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 mb-2">上映時間</label>
                  <input
                    type="text"
                    value={formData.duration || ''}
                    onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                    className="w-full px-4 py-2 bg-dark-light text-white rounded"
                  />
                </div>
                <div className="rounded-lg border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                  作品はメンバーシップ見放題として公開されます。
                </div>
              </div>
            </div>
            <div className="flex justify-end space-x-4 mt-8">
              <button
                onClick={closeModal}
                className="px-6 py-2 bg-dark-light text-gray-300 rounded-lg hover:bg-dark transition"
              >
                キャンセル
              </button>
              <button
                onClick={() => (selectedMovie ? handleUpdate(selectedMovie.id) : handleCreate())}
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
