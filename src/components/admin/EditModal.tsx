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
    setEditedVideo(prev => ({
      ...prev!,
      [name]: name === 'price' ? Number(value) : value
    }));
  };

  const handleSubmit = () => {
    if (editedVideo) {
      onSave(editedVideo);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
      <div className="bg-dark-lighter p-6 rounded-lg w-full max-w-2xl">
        <h3 className="text-xl font-semibold text-white mb-4">動画情報の編集</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              タイトル
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
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                価格
              </label>
              <input
                type="number"
                name="price"
                value={editedVideo.price?.toString() ?? '0'}
                onChange={(e) => {
                  const value = e.target.value;
                  setEditedVideo(prev => ({
                    ...prev!,
                    price: Number(value) || 0
                  }));
                }}
                className="w-full px-3 py-2 bg-dark rounded border border-dark-light text-white"
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
