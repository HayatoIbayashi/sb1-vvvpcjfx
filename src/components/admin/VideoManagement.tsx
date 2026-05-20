import { useEffect, useMemo, useState } from 'react';
import { Edit2, Plus, Shuffle, Trash2 } from 'lucide-react';
import { MOCK_MOVIES } from '../../mockData';
import useApiClient from '../../lib/useApiClient';
import type { Database } from '../../lib/types';
import { getMovieAccessLabel, toMovieAccessPayload } from '../../lib/movieAccess';
import { MOVIE_GENRE_MASTER } from '../../lib/movieGenres';
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

const SAMPLE_TITLES = [
  'テスト動画',
  'test_movie',
];

const SAMPLE_DESCRIPTIONS = [
  '孤独な主人公が巨大な陰謀に巻き込まれ、限られた時間の中で真実へ迫るサンプル作品です。',
  '都会の片隅で起きた事件をきっかけに、登場人物たちの過去と選択が交差していきます。',
  '緊張感のあるアクションと人間ドラマを組み合わせた、管理画面確認用の紹介文です。',
  '静かな日常が一変し、信頼と裏切りの狭間で答えを探す物語です。',
];

const SAMPLE_CAST = [
  '佐藤テスト',
  '高橋テスト',
  '田中テスト',
  '鈴木テスト',
  '中村テスト',
  'テスト楓',
  'テスト航',
  'テスト葵',
];

const SAMPLE_DIRECTORS = [
  'テスト健一',
  'テスト沙織',
  '青木テスト',
  '西村テスト',
  '長谷川テスト',
];

const SAMPLE_ACCESS_TIERS: MovieFormData['accessTier'][] = [
  'public',
  'member',
  'purchase',
  'subscription',
  'subscription_or_purchase',
];

const SAMPLE_BUY_PRICES = [500, 800, 1000, 1200, 1500, 1800, 2000];

function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function randomInteger(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickRandomItems<T>(items: T[], minCount: number, maxCount: number) {
  const count = Math.min(randomInteger(minCount, maxCount), items.length);
  return [...items]
    .sort(() => Math.random() - 0.5)
    .slice(0, count);
}

function createRandomMovieFormPatch(): Partial<MovieFormData> {
  const accessTier = pickRandom(SAMPLE_ACCESS_TIERS);
  const buyPrice = accessTier === 'purchase' || accessTier === 'subscription_or_purchase'
    ? pickRandom(SAMPLE_BUY_PRICES)
    : 0;
  const isHomeFeature = Math.random() >= 0.5;

  return {
    title: `${pickRandom(SAMPLE_TITLES)} ${randomInteger(1, 999)}`,
    description: pickRandom(SAMPLE_DESCRIPTIONS),
    release_date: `${randomInteger(2020, 2026)}-${String(randomInteger(1, 12)).padStart(2, '0')}-${String(randomInteger(1, 28)).padStart(2, '0')}`,
    duration: `${randomInteger(8, 130)}分`,
    genre: pickRandomItems(MOVIE_GENRE_MASTER, 1, 3),
    cast: pickRandomItems(SAMPLE_CAST, 2, 4),
    director: pickRandom(SAMPLE_DIRECTORS),
    release_year: randomInteger(2000, 2026),
    accessTier,
    buyPrice,
    buy_price: buyPrice,
    is_published: Math.random() >= 0.25,
    is_home_feature: isHomeFeature,
    home_featured_order: isHomeFeature ? randomInteger(1, 20) : null,
  };
}

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

  const fillRandomFormData = () => {
    setFormData((current) => ({ ...current, ...createRandomMovieFormPatch() }));
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
        const { accessTier, videoFile, buyPrice, ...nextFields } = formData;
        void videoFile;
        setVideos((current) => current.map((video) => (
          video.id === selectedVideo.id
            ? {
              ...video,
              ...nextFields,
              ...toMovieAccessPayload(accessTier, buyPrice),
              updated_at: new Date().toISOString(),
            }
            : video
        )));
      } else {
        const accessPayload = toMovieAccessPayload(formData.accessTier, formData.buyPrice);
        const newVideo: Movie = {
          id: Math.random().toString(36).slice(2, 11),
          title: formData.title || '',
          description: formData.description || null,
          thumbnail: formData.thumbnail || null,
          thumbnail_top: formData.thumbnail_top || formData.thumbnail || null,
          thumbnail_detail: formData.thumbnail_detail || formData.thumbnail || null,
          release_date: formData.release_date || null,
          duration: formData.duration || null,
          director: formData.director || null,
          release_year: formData.release_year ?? null,
          price: accessPayload.price ?? 0,
          rental_price: accessPayload.rental_price ?? 0,
          access_mode: accessPayload.access_mode ?? 'public',
          buy_price: accessPayload.buy_price ?? 0,
          currency: accessPayload.currency ?? 'JPY',
          genre: formData.genre || [],
          cast: formData.cast || [],
          is_published: formData.is_published === true,
          is_home_feature: formData.is_home_feature === true,
          home_featured_order: formData.is_home_feature ? formData.home_featured_order ?? null : null,
          stripe_price_id_one_time: null,
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
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onMouseDown={closeModal}
        >
          <div
            className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-lg bg-gray-800 p-8"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="text-2xl font-bold text-white">
                {selectedVideo ? '動画を編集' : '新規動画を追加'}
              </h3>
              {!selectedVideo && (
                <button
                  type="button"
                  onClick={fillRandomFormData}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-cyan-400/50 bg-cyan-500/10 px-4 py-2 text-sm font-medium text-cyan-100 transition hover:bg-cyan-500/20"
                >
                  <Shuffle className="h-4 w-4" />
                  <span>ランダム入力</span>
                </button>
              )}
            </div>

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
                    <option value="purchase">単品購入</option>
                    <option value="subscription">サブスク用</option>
                    <option value="subscription_or_purchase">サブスク/単品</option>
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-gray-300">監督</label>
                  <input
                    type="text"
                    value={formData.director || ''}
                    onChange={(event) => updateFormData({ director: event.target.value })}
                    aria-label="監督"
                    className="w-full rounded bg-gray-900 px-4 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-gray-300">公開年</label>
                  <input
                    type="number"
                    min={0}
                    value={formData.release_year ?? ''}
                    onChange={(event) => updateFormData({
                      release_year: event.target.value === '' ? null : Number(event.target.value),
                    })}
                    aria-label="公開年"
                    className="w-full rounded bg-gray-900 px-4 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-gray-300">単品価格</label>
                  <input
                    type="number"
                    min={0}
                    value={formData.buyPrice || formData.buy_price || 0}
                    onChange={(event) => updateFormData({
                      buyPrice: Number(event.target.value || 0),
                      buy_price: Number(event.target.value || 0),
                    })}
                    aria-label="単品価格"
                    className="w-full rounded bg-gray-900 px-4 py-2 text-white"
                  />
                </div>
                <div>
                  <h4 className="mb-2 text-sm font-medium text-gray-300">Stripe単品Price ID</h4>
                  <div className="min-h-10 rounded bg-gray-900 px-4 py-2 font-mono text-sm text-gray-200">
                    {selectedVideo
                      ? selectedVideo.stripe_price_id_one_time || '未設定'
                      : '作成後に表示されます'}
                  </div>
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

                <label className="flex items-center gap-3 rounded border border-gray-700 bg-gray-900 px-4 py-3 text-gray-300">
                  <input
                    type="checkbox"
                    checked={formData.is_published === true}
                    onChange={(event) => updateFormData({ is_published: event.target.checked })}
                    aria-label="公開する"
                    className="h-4 w-4"
                  />
                  <span>公開する</span>
                </label>
                <label className="flex items-center gap-3 rounded border border-gray-700 bg-gray-900 px-4 py-3 text-gray-300">
                  <input
                    type="checkbox"
                    checked={formData.is_home_feature === true}
                    onChange={(event) => updateFormData({
                      is_home_feature: event.target.checked,
                      home_featured_order: event.target.checked ? formData.home_featured_order : null,
                    })}
                    aria-label="おすすめ"
                    className="h-4 w-4"
                  />
                  <span>おすすめ</span>
                </label>
                <div>
                  <label className="mb-2 block text-gray-300">おすすめの順番</label>
                  <input
                    type="number"
                    min={0}
                    value={formData.home_featured_order ?? ''}
                    onChange={(event) => updateFormData({
                      home_featured_order: event.target.value === '' ? null : Number(event.target.value),
                    })}
                    aria-label="おすすめの順番"
                    disabled={formData.is_home_feature !== true}
                    className="w-full rounded bg-gray-900 px-4 py-2 text-white disabled:cursor-not-allowed disabled:opacity-50"
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
                className="rounded-lg bg-gray-900 px-6 py-2 text-gray-300 transition hover:bg-gray-700"
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
