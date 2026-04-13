import { useEffect, useMemo, useState } from 'react';
import { Edit2, Plus, Trash2 } from 'lucide-react';
import { MOCK_MOVIES } from '../../mockData';
import useApiClient from '../../lib/useApiClient';
import type { Database } from '../../lib/types';
import { buildMoviePayload, createEmptyFormData, splitCsv } from './movieManagementForm';

type Movie = Database['public']['Tables']['movies']['Row'];

function createVideoFormData(): Partial<Movie> {
  return {
    ...createEmptyFormData(),
    thumbnail: '',
    thumbnail_top: '',
    thumbnail_detail: '',
  };
}

export function VideoManagement() {
  const api = useApiClient();
  const useMockMovies = import.meta.env.VITE_USE_MOCK_MOVIES === 'true';

  const [videos, setVideos] = useState<Movie[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<Movie | null>(null);
  const [formData, setFormData] = useState<Partial<Movie>>(createVideoFormData());

  useEffect(() => {
    let cancelled = false;

    const fetchVideos = async () => {
      try {
        setIsLoading(true);
        setError(null);

        if (useMockMovies) {
          await new Promise((resolve) => setTimeout(resolve, 300));
          if (!cancelled) setVideos(MOCK_MOVIES);
          return;
        }

        const res = await api.getAdminMovies();
        if (!cancelled) setVideos(res.items);
      } catch (err) {
        if (!cancelled) setError('動画データの取得に失敗しました。');
        console.error('Error fetching videos:', err);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    fetchVideos();
    return () => {
      cancelled = true;
    };
  }, [api, useMockMovies]);

  const filteredVideos = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return videos;

    return videos.filter((video) => {
      const fields = [
        video.title || '',
        video.description || '',
        (video.genre || []).join(' '),
        (video.cast || []).join(' '),
      ]
        .join(' ')
        .toLowerCase();
      return fields.includes(normalizedQuery);
    });
  }, [videos, query]);

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedVideo(null);
    setFormData(createVideoFormData());
  };

  const openCreateModal = () => {
    setError(null);
    setSelectedVideo(null);
    setFormData(createVideoFormData());
    setIsModalOpen(true);
  };

  const openEditModal = (video: Movie) => {
    setError(null);
    setSelectedVideo(video);
    setFormData({
      title: video.title,
      description: video.description || '',
      thumbnail: video.thumbnail || '',
      thumbnail_top: video.thumbnail_top || '',
      thumbnail_detail: video.thumbnail_detail || '',
      release_date: video.release_date || '',
      duration: video.duration || '',
      price: video.price ?? 0,
      rental_price: video.rental_price ?? 0,
      genre: video.genre || [],
      cast: video.cast || [],
    });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    try {
      setError(null);
      if (!formData.title?.trim()) {
        setError('タイトルは必須です。');
        return;
      }

      if (!useMockMovies) {
        if (selectedVideo) {
          const updatedVideo = await api.updateAdminMovie(
            selectedVideo.id,
            buildMoviePayload(formData),
          );
          setVideos((prev) => prev.map((video) => (
            video.id === selectedVideo.id ? updatedVideo : video
          )));
        } else {
          const createdVideo = await api.createAdminMovie(buildMoviePayload(formData));
          setVideos((prev) => [createdVideo, ...prev]);
        }
        closeModal();
        return;
      }

      if (selectedVideo) {
        setVideos((prev) => prev.map((video) => (
          video.id === selectedVideo.id
            ? { ...video, ...formData, updated_at: new Date().toISOString() }
            : video
        )));
      } else {
        const newVideo: Movie = {
          id: Math.random().toString(36).slice(2, 11),
          title: formData.title || '',
          description: formData.description || null,
          thumbnail: formData.thumbnail || null,
          thumbnail_top: formData.thumbnail_top || formData.thumbnail || null,
          thumbnail_detail: formData.thumbnail_detail || formData.thumbnail || null,
          release_date: formData.release_date || null,
          duration: formData.duration || null,
          director: null,
          release_year: null,
          price: formData.price ?? 0,
          rental_price: formData.rental_price ?? 0,
          genre: formData.genre || [],
          cast: formData.cast || [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        setVideos((prev) => [newVideo, ...prev]);
      }

      closeModal();
    } catch (err) {
      setError(selectedVideo ? '動画の更新に失敗しました。' : '動画の登録に失敗しました。');
      console.error('Error saving video:', err);
    }
  };

  const handleDelete = async (videoId: string) => {
    if (!confirm('本当にこの動画を削除しますか？')) return;

    try {
      setError(null);
      if (!useMockMovies) {
        await api.deleteAdminMovie(videoId);
      }
      setVideos((prev) => prev.filter((video) => video.id !== videoId));
    } catch (err) {
      setError('動画の削除に失敗しました。');
      console.error('Error deleting video:', err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-white">動画管理</h2>
          <p className="mt-1 text-sm text-gray-400">管理画面から動画情報を登録・更新・削除できます。</p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-white transition hover:bg-primary/90"
        >
          <Plus className="h-5 w-5" />
          <span>新規動画を追加</span>
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500 bg-red-500/10 px-4 py-3 text-red-400">
          {error}
        </div>
      )}

      <div className="rounded-lg bg-dark-lighter p-6">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="タイトル・説明・出演者・ジャンルで検索"
          aria-label="動画検索"
          className="w-full rounded-lg border border-dark-light bg-dark px-4 py-2 text-white outline-none focus:border-gray-600"
        />
      </div>

      <div className="overflow-hidden rounded-lg bg-dark-lighter">
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-white"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-dark">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">動画</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">公開日</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">価格</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark">
                {filteredVideos.map((video) => (
                  <tr key={video.id}>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <img
                          src={video.thumbnail || 'https://placehold.co/160x240?text=No+Image'}
                          alt={video.title}
                          className="h-12 w-20 rounded object-cover"
                        />
                        <div className="ml-4 min-w-0">
                          <div className="text-sm font-medium text-white">{video.title}</div>
                          <div className="truncate text-sm text-gray-400" title={video.description || undefined}>
                            {video.description || '説明なし'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-300">{video.release_date || '-'}</td>
                    <td className="px-6 py-4 text-sm text-white">
                      本編 ¥{video.price.toLocaleString()}
                      <br />
                      <span className="text-gray-400">レンタル ¥{video.rental_price.toLocaleString()}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEditModal(video)}
                          className="rounded p-1 text-gray-400 transition hover:text-white"
                          aria-label={`${video.title} を編集`}
                        >
                          <Edit2 className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(video.id)}
                          className="rounded p-1 text-gray-400 transition hover:text-red-400"
                          aria-label={`${video.title} を削除`}
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!filteredVideos.length && (
                  <tr>
                    <td colSpan={4} className="px-6 py-10 text-center text-gray-400">
                      条件に一致する動画が見つかりません
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-lg bg-dark-lighter p-8">
            <h3 className="mb-6 text-2xl font-bold text-white">
              {selectedVideo ? '動画を編集' : '新規動画を登録'}
            </h3>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-gray-300">タイトル</label>
                  <input
                    type="text"
                    value={formData.title || ''}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    aria-label="タイトル"
                    className="w-full rounded bg-dark px-4 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-gray-300">説明</label>
                  <textarea
                    value={formData.description || ''}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    aria-label="説明"
                    className="h-32 w-full rounded bg-dark px-4 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-gray-300">サムネイル URL</label>
                  <input
                    type="text"
                    value={formData.thumbnail || ''}
                    onChange={(e) => setFormData({ ...formData, thumbnail: e.target.value })}
                    aria-label="サムネイル URL"
                    className="w-full rounded bg-dark px-4 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-gray-300">ジャンル（カンマ区切り）</label>
                  <input
                    type="text"
                    value={(formData.genre || []).join(', ')}
                    onChange={(e) => setFormData({ ...formData, genre: splitCsv(e.target.value) })}
                    aria-label="ジャンル"
                    className="w-full rounded bg-dark px-4 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-gray-300">出演者（カンマ区切り）</label>
                  <input
                    type="text"
                    value={(formData.cast || []).join(', ')}
                    onChange={(e) => setFormData({ ...formData, cast: splitCsv(e.target.value) })}
                    aria-label="出演者"
                    className="w-full rounded bg-dark px-4 py-2 text-white"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-gray-300">公開日</label>
                  <input
                    type="date"
                    value={formData.release_date || ''}
                    onChange={(e) => setFormData({ ...formData, release_date: e.target.value })}
                    aria-label="公開日"
                    className="w-full rounded bg-dark px-4 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-gray-300">再生時間</label>
                  <input
                    type="text"
                    value={formData.duration || ''}
                    onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                    aria-label="再生時間"
                    className="w-full rounded bg-dark px-4 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-gray-300">本編価格（円）</label>
                  <input
                    type="number"
                    min={0}
                    value={formData.price ?? 0}
                    onChange={(e) => setFormData({ ...formData, price: Number(e.target.value || 0) })}
                    aria-label="本編価格"
                    className="w-full rounded bg-dark px-4 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-gray-300">レンタル価格（円）</label>
                  <input
                    type="number"
                    min={0}
                    value={formData.rental_price ?? 0}
                    onChange={(e) => setFormData({ ...formData, rental_price: Number(e.target.value || 0) })}
                    aria-label="レンタル価格"
                    className="w-full rounded bg-dark px-4 py-2 text-white"
                  />
                </div>
              </div>
            </div>

            <div className="mt-8 flex justify-end gap-4">
              <button
                onClick={closeModal}
                className="rounded-lg bg-dark px-6 py-2 text-gray-300 transition hover:bg-gray-800"
              >
                キャンセル
              </button>
              <button
                onClick={handleSave}
                className="rounded-lg bg-primary px-6 py-2 text-white transition hover:bg-primary/90"
              >
                {selectedVideo ? '更新する' : '登録する'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
