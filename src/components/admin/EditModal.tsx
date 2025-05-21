import { useState, useEffect } from 'react';
import type { Database } from '../../lib/types';

type Movie = Database['public']['Tables']['movies']['Row'];

interface EditModalProps {
  isOpen: boolean;
  video: Movie | null;
  onClose: () => void;
  onSave: (video: Movie) => void;
}

export function EditModal({ isOpen, video, onClose, onSave }: EditModalProps) {
  const [editedVideo, setEditedVideo] = useState<Movie | null>(null);

  useEffect(() => {
    setEditedVideo(video);
  }, [video]);

  if (!isOpen || !editedVideo) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditedVideo(prev => {
      if (!prev) return prev;
      
      // 配列フィールドをカンマ区切り文字列として処理
      if (name === 'genre' || name === 'cast') {
        return {
          ...prev,
          [name]: value ? value.split(',').map(item => item.trim()) : []
        };
      }
      
      // 数値フィールド
      if (name === 'price' || name === 'rental_price' || name === 'release_year' || name === 'duration') {
        return {
          ...prev,
          [name]: value ? Number(value) : 0
        };
      }
      
      return {
        ...prev,
        [name]: value
      };
    });
  };

  const handleSubmit = () => {
    if (editedVideo) {
      onSave(editedVideo);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
      <div className="bg-dark-lighter p-6 rounded-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <h3 className="text-xl font-semibold text-white mb-4">動画情報の編集</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                タイトル*
              </label>
              <input
                type="text"
                name="title"
                value={editedVideo.title}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-dark rounded border border-dark-light text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                説明
              </label>
              <textarea
                name="description"
                value={editedVideo.description ?? ''}
                rows={3}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-dark rounded border border-dark-light text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  購入価格*
                </label>
                <input
                  type="number"
                  name="price"
                  value={editedVideo.price?.toString() ?? '0'}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-dark rounded border border-dark-light text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  レンタル価格*
                </label>
                <input
                  type="number"
                  name="rental_price"
                  value={editedVideo.rental_price?.toString() ?? '0'}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-dark rounded border border-dark-light text-white"
                />
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                出演者
              </label>
              <input
                type="text"
                name="cast"
                value={editedVideo.cast ?? ''}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-dark rounded border border-dark-light text-white"
                placeholder="主演者名を入力"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                公開日
              </label>
              <input
                type="date"
                name="release_date"
                value={editedVideo.release_date ?? ''}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-dark rounded border border-dark-light text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                公開年
              </label>
              <input
                type="number"
                name="release_year"
                value={editedVideo.release_year ?? ''}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-dark rounded border border-dark-light text-white"
                placeholder="2023"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                上映時間 (分)
              </label>
              <input
                type="number"
                name="duration"
                value={editedVideo.duration ?? ''}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-dark rounded border border-dark-light text-white"
                placeholder="120"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                監督
              </label>
              <input
                type="text"
                name="director"
                value={editedVideo.director ?? ''}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-dark rounded border border-dark-light text-white"
                placeholder="監督名を入力"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                ジャンル (カンマ区切り)
              </label>
              <input
                type="text"
                name="genres"
                value={editedVideo.genres ?? ''}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-dark rounded border border-dark-light text-white"
                placeholder="アクション, ドラマ, コメディ"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-4 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-400 hover:text-white transition"
          >
            キャンセル
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90 transition"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}
