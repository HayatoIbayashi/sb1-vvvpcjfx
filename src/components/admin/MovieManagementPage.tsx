import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit2, Plus, Trash2 } from 'lucide-react';
import useApiClient from '../../lib/useApiClient';
import { MOCK_MOVIES } from '../../mockData';
import type { Database } from '../../lib/types';
import { getMovieAccessLabel, toMovieAccessPayload } from '../../lib/movieAccess';
import { getTestMovieThumbnail } from '../../lib/testMovieThumbnails';
import {
  buildMoviePayload,
  createEmptyFormData,
  createMovieFormData,
  splitCsv,
  type MovieFormData,
} from './movieManagementForm';
import MovieGenreField from './MovieGenreField';
import VideoFileField from './VideoFileField';

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
  const [formData, setFormData] = useState<MovieFormData>(createEmptyFormData());

  useEffect(() => {
    let cancelled = false;

    const fetchMovies = async () => {
      try {
        setIsLoading(true);
        setError(null);

        if (useMockMovies) {
          await new Promise((resolve) => setTimeout(resolve, 300));
          if (!cancelled) {
            setMovies(MOCK_MOVIES);
          }
          return;
        }

        const response = await api.getAdminMovies();
        if (!cancelled) {
          setMovies(response.items);
        }
      } catch (err) {
        if (!cancelled) {
          setError('動画データの取得に失敗しました。');
        }
        console.error('Error fetching movies:', err);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    fetchMovies();
    return () => {
      cancelled = true;
    };
  }, [api, useMockMovies]);

  const filteredMovies = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return movies;
    }

    return movies.filter((movie) => {
      const searchTarget = [
        movie.title || '',
        movie.description || '',
        (movie.genre || []).join(' '),
        (movie.cast || []).join(' '),
      ]
        .join(' ')
        .toLowerCase();

      return searchTarget.includes(normalizedQuery);
    });
  }, [movies, query]);

  const updateFormData = (patch: Partial<MovieFormData>) => {
    setFormData((current) => ({ ...current, ...patch }));
  };

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
    setFormData(createMovieFormData(movie));
    setIsModalOpen(true);
  };

  const handleCreate = async () => {
    try {
      setError(null);
      if (!formData.title?.trim()) {
        setError('タイトルは必須です。');
        return;
      }

      if (!useMockMovies) {
        const createdMovie = await api.createAdminMovie(buildMoviePayload(formData));
        setMovies((current) => [createdMovie, ...current]);
        closeModal();
        return;
      }

      const createdMovie: Movie = {
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
        ...toMovieAccessPayload(formData.accessTier),
        genre: formData.genre || [],
        cast: formData.cast || [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      setMovies((current) => [createdMovie, ...current]);
      closeModal();
    } catch (err) {
      setError('動画の新規追加に失敗しました。');
      console.error('Error creating movie:', err);
    }
  };

  const handleUpdate = async (movieId: string) => {
    try {
      setError(null);
      if (!formData.title?.trim()) {
        setError('タイトルは必須です。');
        return;
      }

      if (!useMockMovies) {
        const updatedMovie = await api.updateAdminMovie(movieId, buildMoviePayload(formData));
        setMovies((current) => current.map((movie) => (movie.id === movieId ? updatedMovie : movie)));
        closeModal();
        return;
      }

      const { accessTier, videoFile, ...nextFields } = formData;
      void videoFile;
      setMovies((current) => current.map((movie) => (
        movie.id === movieId
          ? {
              ...movie,
              ...nextFields,
              ...toMovieAccessPayload(accessTier),
              updated_at: new Date().toISOString(),
            }
          : movie
      )));
      closeModal();
    } catch (err) {
      setError('動画の更新に失敗しました。');
      console.error('Error updating movie:', err);
    }
  };

  const handleDelete = async (movieId: string) => {
    if (!window.confirm('この動画を削除しますか？')) {
      return;
    }

    try {
      setError(null);
      if (!useMockMovies) {
        await api.deleteAdminMovie(movieId);
      }
      setMovies((current) => current.filter((movie) => movie.id !== movieId));
    } catch (err) {
      setError('動画の削除に失敗しました。');
      console.error('Error deleting movie:', err);
    }
  };

  return (
    <div className="min-h-screen bg-dark">
      <header className="bg-dark-lighter shadow-lg">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/')}
                className="text-gray-400 transition hover:text-white"
                aria-label="トップへ戻る"
              >
                <ArrowLeft className="h-6 w-6" />
              </button>
              <h1 className="text-2xl font-bold text-white">動画管理</h1>
            </div>
            <button
              onClick={openCreateModal}
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-white transition hover:bg-primary/90"
            >
              <Plus className="h-5 w-5" />
              <span>新規動画追加</span>
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {error && (
          <div className="mb-6 rounded-lg border border-red-500 bg-red-500/10 px-4 py-3 text-red-400">
            {error}
          </div>
        )}

        <div className="mb-6">
          <label htmlFor="movie-management-search" className="mb-2 block text-gray-300">
            動画検索
          </label>
          <input
            id="movie-management-search"
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="タイトル・説明・出演者・ジャンルで検索"
            className="w-full rounded border border-transparent bg-dark-light px-4 py-2 text-white outline-none transition focus:border-gray-600"
          />
        </div>

        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-white"></div>
          </div>
        ) : (
          <div className="grid gap-6">
            {filteredMovies.map((movie) => (
              <div
                key={movie.id}
                className="overflow-hidden rounded-lg bg-dark-lighter shadow-lg"
              >
                <div className="flex items-start gap-6 p-6">
                  <img
                    src={getTestMovieThumbnail(movie, 'card')}
                    alt={movie.title}
                    className="h-48 w-32 rounded-lg object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <h2 className="mb-2 text-xl font-bold text-white">{movie.title}</h2>
                    <p className="mb-4 line-clamp-2 text-gray-400">
                      {movie.description || '説明はありません。'}
                    </p>
                    <div className="grid grid-cols-1 gap-3 text-sm text-gray-300 md:grid-cols-2">
                      <div>
                        <span className="text-gray-500">公開範囲:</span>{' '}
                        {getMovieAccessLabel(createMovieFormData(movie).accessTier)}
                      </div>
                      <div>
                        <span className="text-gray-500">公開日:</span> {movie.release_date || '-'}
                      </div>
                      <div className="md:col-span-2">
                        <span className="text-gray-500">ジャンル:</span>{' '}
                        {(movie.genre || []).join(', ') || '-'}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => openEditModal(movie)}
                      className="flex items-center gap-2 rounded-lg bg-blue-500 px-4 py-2 text-white transition hover:bg-blue-600"
                      aria-label={`${movie.title} を編集`}
                    >
                      <Edit2 className="h-4 w-4" />
                      <span>編集</span>
                    </button>
                    <button
                      onClick={() => handleDelete(movie.id)}
                      className="flex items-center gap-2 rounded-lg bg-red-500 px-4 py-2 text-white transition hover:bg-red-600"
                      aria-label={`${movie.title} を削除`}
                    >
                      <Trash2 className="h-4 w-4" />
                      <span>削除</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {!filteredMovies.length && (
              <div className="rounded-lg border border-dashed border-gray-700 py-12 text-center text-gray-400">
                条件に一致する動画が見つかりません。
              </div>
            )}
          </div>
        )}
      </main>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-lg bg-dark-lighter p-8 shadow-xl">
            <h2 className="mb-6 text-2xl font-bold text-white">
              {selectedMovie ? '動画を編集' : '新規動画を追加'}
            </h2>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-gray-300">タイトル</label>
                  <input
                    type="text"
                    value={formData.title || ''}
                    onChange={(event) => updateFormData({ title: event.target.value })}
                    className="w-full rounded bg-dark-light px-4 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-gray-300">説明</label>
                  <textarea
                    value={formData.description || ''}
                    onChange={(event) => updateFormData({ description: event.target.value })}
                    className="h-32 w-full rounded bg-dark-light px-4 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-gray-300">サムネイル URL</label>
                  <input
                    type="text"
                    value={formData.thumbnail || ''}
                    onChange={(event) => updateFormData({ thumbnail: event.target.value })}
                    className="w-full rounded bg-dark-light px-4 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-gray-300">トップ表示用サムネイル URL</label>
                  <input
                    type="text"
                    value={formData.thumbnail_top || ''}
                    onChange={(event) => updateFormData({ thumbnail_top: event.target.value })}
                    className="w-full rounded bg-dark-light px-4 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-gray-300">詳細表示用サムネイル URL</label>
                  <input
                    type="text"
                    value={formData.thumbnail_detail || ''}
                    onChange={(event) => updateFormData({ thumbnail_detail: event.target.value })}
                    className="w-full rounded bg-dark-light px-4 py-2 text-white"
                  />
                </div>
                <div>
                  <MovieGenreField
                    selectedGenres={formData.genre || []}
                    onChange={(genre) => updateFormData({ genre })}
                  />
                </div>
                <div>
                  <label className="mb-2 block text-gray-300">出演者</label>
                  <input
                    type="text"
                    value={(formData.cast || []).join(', ')}
                    onChange={(event) => updateFormData({ cast: splitCsv(event.target.value) })}
                    className="w-full rounded bg-dark-light px-4 py-2 text-white"
                    placeholder="出演者A, 出演者B"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-gray-300">公開日</label>
                  <input
                    type="date"
                    value={formData.release_date || ''}
                    onChange={(event) => updateFormData({ release_date: event.target.value })}
                    className="w-full rounded bg-dark-light px-4 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-gray-300">再生時間</label>
                  <input
                    type="text"
                    value={formData.duration || ''}
                    onChange={(event) => updateFormData({ duration: event.target.value })}
                    className="w-full rounded bg-dark-light px-4 py-2 text-white"
                    placeholder="120分 / 01:30:00"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-gray-300">公開範囲</label>
                  <select
                    value={formData.accessTier}
                    onChange={(event) => updateFormData({
                      accessTier: event.target.value as MovieFormData['accessTier'],
                    })}
                    className="w-full rounded bg-dark-light px-4 py-2 text-white"
                  >
                    <option value="public">一般公開</option>
                    <option value="member">メンバーシップ登録で視聴</option>
                  </select>
                </div>

                <VideoFileField
                  inputId="movie-management-mp4"
                  isEditMode={selectedMovie != null}
                  selectedFile={formData.videoFile}
                  onSelectFile={(videoFile) => updateFormData({ videoFile })}
                />

                <div className="rounded-lg border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                  MP4 の実アップロードは Elemental 実装と接続してから有効化します。今は管理画面の入力導線だけ先に用意しています。
                </div>
              </div>
            </div>

            <div className="mt-8 flex justify-end gap-4">
              <button
                onClick={closeModal}
                className="rounded-lg bg-dark-light px-6 py-2 text-gray-300 transition hover:bg-dark"
              >
                キャンセル
              </button>
              <button
                onClick={() => (selectedMovie ? handleUpdate(selectedMovie.id) : handleCreate())}
                className="rounded-lg bg-primary px-6 py-2 text-white transition hover:bg-primary/90"
              >
                {selectedMovie ? '更新' : '追加'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
