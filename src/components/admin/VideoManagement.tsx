import { useEffect, useMemo, useState } from 'react';
import { Edit2, Plus, Trash2 } from 'lucide-react';
import { MOCK_MOVIES } from '../../mockData';
import useApiClient from '../../lib/useApiClient';
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
import VideoFileField from './VideoFileField';

type Movie = Database['public']['Tables']['movies']['Row'];

function createVideoFormData(): MovieFormData {
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
  const [formData, setFormData] = useState<MovieFormData>(createVideoFormData());

  useEffect(() => {
    let cancelled = false;

    const fetchVideos = async () => {
      try {
        setIsLoading(true);
        setError(null);

        if (useMockMovies) {
          await new Promise((resolve) => setTimeout(resolve, 300));
          if (!cancelled) {
            setVideos(MOCK_MOVIES);
          }
          return;
        }

        const response = await api.getAdminMovies();
        if (!cancelled) {
          setVideos(response.items);
        }
      } catch (err) {
        if (!cancelled) {
          setError('動画データの取得に失敗しました。');
        }
        console.error('Error fetching videos:', err);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    fetchVideos();
    return () => {
      cancelled = true;
    };
  }, [api, useMockMovies]);

  const filteredVideos = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return videos;
    }

    return videos.filter((video) => {
      const searchTarget = [
        video.title || '',
        video.description || '',
        (video.genre || []).join(' '),
        (video.cast || []).join(' '),
      ]
        .join(' ')
        .toLowerCase();

      return searchTarget.includes(normalizedQuery);
    });
  }, [videos, query]);

  const updateFormData = (patch: Partial<MovieFormData>) => {
    setFormData((current) => ({ ...current, ...patch }));
  };

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
      ...createVideoFormData(),
      ...createMovieFormData(video),
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
          setVideos((current) => current.map((video) => (
            video.id === selectedVideo.id ? updatedVideo : video
          )));
        } else {
          const createdVideo = await api.createAdminMovie(buildMoviePayload(formData));
          setVideos((current) => [createdVideo, ...current]);
        }

        closeModal();
        return;
      }

      if (selectedVideo) {
        const { accessTier, videoFile, ...nextFields } = formData;
        void videoFile;
        setVideos((current) => current.map((video) => (
          video.id === selectedVideo.id
            ? {
                ...video,
                ...nextFields,
                ...toMovieAccessPayload(accessTier),
                updated_at: new Date().toISOString(),
              }
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
          ...toMovieAccessPayload(formData.accessTier),
          genre: formData.genre || [],
          cast: formData.cast || [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        setVideos((current) => [newVideo, ...current]);
      }

      closeModal();
    } catch (err) {
      setError(selectedVideo ? '動画の更新に失敗しました。' : '動画の追加に失敗しました。');
      console.error('Error saving video:', err);
    }
  };

  const handleDelete = async (videoId: string) => {
    if (!window.confirm('この動画を削除しますか？')) {
      return;
    }

    try {
      setError(null);
      if (!useMockMovies) {
        await api.deleteAdminMovie(videoId);
      }
      setVideos((current) => current.filter((video) => video.id !== videoId));
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
          <p className="mt-1 text-sm text-gray-400">
            動画一覧から動画情報の追加・更新・削除ができます。
          </p>
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

      <div className="rounded-lg bg-gray-800 p-6">
        <input
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="タイトル・説明・出演者・ジャンルで検索"
          aria-label="動画検索"
          className="w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-2 text-white outline-none focus:border-gray-500"
        />
      </div>

      <div className="overflow-hidden rounded-lg bg-gray-800">
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-white"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                    動画
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                    公開日
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                    公開範囲
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {filteredVideos.map((video) => (
                  <tr key={video.id}>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <img
                          src={getTestMovieThumbnail(video, 'card')}
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
                      {getMovieAccessLabel(createMovieFormData(video).accessTier)}
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
                      条件に一致する動画が見つかりません。
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
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-lg bg-gray-800 p-8">
            <h3 className="mb-6 text-2xl font-bold text-white">
              {selectedVideo ? '動画を編集' : '新規動画を追加'}
            </h3>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-gray-300">タイトル</label>
                  <input
                    type="text"
                    value={formData.title || ''}
                    onChange={(event) => updateFormData({ title: event.target.value })}
                    aria-label="タイトル"
                    className="w-full rounded bg-gray-900 px-4 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-gray-300">説明</label>
                  <textarea
                    value={formData.description || ''}
                    onChange={(event) => updateFormData({ description: event.target.value })}
                    aria-label="説明"
                    className="h-32 w-full rounded bg-gray-900 px-4 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-gray-300">サムネイル URL</label>
                  <input
                    type="text"
                    value={formData.thumbnail || ''}
                    onChange={(event) => updateFormData({ thumbnail: event.target.value })}
                    aria-label="サムネイル URL"
                    className="w-full rounded bg-gray-900 px-4 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-gray-300">ジャンル</label>
                  <input
                    type="text"
                    value={(formData.genre || []).join(', ')}
                    onChange={(event) => updateFormData({ genre: splitCsv(event.target.value) })}
                    aria-label="ジャンル"
                    className="w-full rounded bg-gray-900 px-4 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-gray-300">出演者</label>
                  <input
                    type="text"
                    value={(formData.cast || []).join(', ')}
                    onChange={(event) => updateFormData({ cast: splitCsv(event.target.value) })}
                    aria-label="出演者"
                    className="w-full rounded bg-gray-900 px-4 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-gray-300">公開範囲</label>
                  <select
                    value={formData.accessTier}
                    onChange={(event) => updateFormData({
                      accessTier: event.target.value as MovieFormData['accessTier'],
                    })}
                    aria-label="公開範囲"
                    className="w-full rounded bg-gray-900 px-4 py-2 text-white"
                  >
                    <option value="public">一般公開</option>
                    <option value="member">メンバーシップ登録で視聴</option>
                  </select>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-gray-300">公開日</label>
                  <input
                    type="date"
                    value={formData.release_date || ''}
                    onChange={(event) => updateFormData({ release_date: event.target.value })}
                    aria-label="公開日"
                    className="w-full rounded bg-gray-900 px-4 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-gray-300">再生時間</label>
                  <input
                    type="text"
                    value={formData.duration || ''}
                    onChange={(event) => updateFormData({ duration: event.target.value })}
                    aria-label="再生時間"
                    className="w-full rounded bg-gray-900 px-4 py-2 text-white"
                  />
                </div>

                <VideoFileField
                  inputId="video-management-mp4"
                  isEditMode={selectedVideo != null}
                  selectedFile={formData.videoFile}
                  onSelectFile={(videoFile) => updateFormData({ videoFile })}
                />

                <div className="rounded-lg border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                  MP4 の実アップロードは Elemental 実装との接続後に有効化します。今は管理画面の操作導線だけを先に追加しています。
                </div>
              </div>
            </div>

            <div className="mt-8 flex justify-end gap-4">
              <button
                onClick={closeModal}
                className="rounded-lg bg-gray-900 px-6 py-2 text-gray-300 transition hover:bg-gray-700"
              >
                キャンセル
              </button>
              <button
                onClick={handleSave}
                className="rounded-lg bg-primary px-6 py-2 text-white transition hover:bg-primary/90"
              >
                {selectedVideo ? '更新する' : '追加する'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
