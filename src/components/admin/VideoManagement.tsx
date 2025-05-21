import { useState, useEffect } from 'react';
import { Upload, Edit2, Trash2, Eye, EyeOff } from 'lucide-react';
import { EditModal } from './EditModal';
import { MOCK_MOVIES } from '../../mockData';
import type { Database } from '../../lib/types';

type Movie = Database['public']['Tables']['movies']['Row'];

export function VideoManagement() {
  const [videos, setVideos] = useState<Movie[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchVideos = async () => {
      try {
        setIsLoading(true);
        // 模擬API呼び出し (実際にはmockデータを使用)
        await new Promise(resolve => setTimeout(resolve, 1000));
        setVideos(MOCK_MOVIES);
      } catch (err) {
        setError('動画データの取得に失敗しました');
        console.error('Error fetching videos:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchVideos();
  }, []);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<Movie | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleUpload = async (file: File) => {
    // Simulate upload progress
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 10;
      });
    }, 500);
  };

  const handleDelete = (videoId: string) => {
    if (confirm('本当にこの動画を削除しますか？')) {
      setVideos(videos.filter(video => video.id !== videoId));
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload Button */}
      <div className="flex justify-end mb-6">
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90 transition"
        >
          新規動画を登録
        </button>
      </div>

      {/* New Video Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50">
          <div className="bg-dark-lighter p-6 rounded-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-semibold text-white mb-4">新規動画登録</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column - Video Upload */}
              <div className="space-y-6">
                <div>
                  <h4 className="text-lg font-medium text-white mb-2">動画ファイル*</h4>
                  <div className="border-2 border-dashed border-dark-light rounded-lg p-6 text-center">
                    <input
                      type="file"
                      accept="video/*"
                      className="hidden"
                      id="video-upload"
                      onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
                    />
                    <label
                      htmlFor="video-upload"
                      className="flex flex-col items-center cursor-pointer"
                    >
                      <Upload className="h-12 w-12 text-gray-400 mb-4" />
                      <span className="text-gray-400">動画ファイルを選択</span>
                    </label>
                    {uploadProgress > 0 && uploadProgress < 100 && (
                      <div className="mt-4">
                        <div className="w-full bg-dark-light rounded-full h-2">
                          <div
                            className="bg-primary h-2 rounded-full transition-all"
                            style={{ width: `${uploadProgress}%` }}
                          />
                        </div>
                        <span className="text-gray-400 text-sm">{uploadProgress}%</span>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="text-lg font-medium text-white mb-2">サムネイル画像*</h4>
                  <div className="border-2 border-dashed border-dark-light rounded-lg p-6 text-center">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      id="thumbnail-upload"
                    />
                    <label
                      htmlFor="thumbnail-upload"
                      className="flex flex-col items-center cursor-pointer"
                    >
                      <Upload className="h-12 w-12 text-gray-400 mb-4" />
                      <span className="text-gray-400">サムネイル画像を選択</span>
                    </label>
                  </div>
                </div>

                <div>
                  <h4 className="text-lg font-medium text-white mb-2">トップページ用サムネイル</h4>
                  <div className="border-2 border-dashed border-dark-light rounded-lg p-6 text-center">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      id="thumbnail-top-upload"
                    />
                    <label
                      htmlFor="thumbnail-top-upload"
                      className="flex flex-col items-center cursor-pointer"
                    >
                      <Upload className="h-12 w-12 text-gray-400 mb-4" />
                      <span className="text-gray-400">トップページ用サムネイルを選択</span>
                    </label>
                  </div>
                </div>

                <div>
                  <h4 className="text-lg font-medium text-white mb-2">詳細ページ用サムネイル</h4>
                  <div className="border-2 border-dashed border-dark-light rounded-lg p-6 text-center">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      id="thumbnail-detail-upload"
                    />
                    <label
                      htmlFor="thumbnail-detail-upload"
                      className="flex flex-col items-center cursor-pointer"
                    >
                      <Upload className="h-12 w-12 text-gray-400 mb-4" />
                      <span className="text-gray-400">詳細ページ用サムネイルを選択</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Right Column - Video Info */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">
                    タイトル*
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 bg-dark rounded border border-dark-light text-white"
                    placeholder="作品タイトル"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">
                    説明
                  </label>
                  <textarea
                    rows={3}
                    className="w-full px-3 py-2 bg-dark rounded border border-dark-light text-white"
                    placeholder="作品の説明"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">
                      購入価格*
                    </label>
                    <input
                      type="number"
                      className="w-full px-3 py-2 bg-dark rounded border border-dark-light text-white"
                      placeholder="¥0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">
                      レンタル価格*
                    </label>
                    <input
                      type="number"
                      className="w-full px-3 py-2 bg-dark rounded border border-dark-light text-white"
                      placeholder="¥0"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">
                    出演者
                  </label>
                  <input
                    type="text"
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
                    className="w-full px-3 py-2 bg-dark rounded border border-dark-light text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">
                    公開年
                  </label>
                  <input
                    type="number"
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
                    className="w-full px-3 py-2 bg-dark rounded border border-dark-light text-white"
                    placeholder="アクション, ドラマ, コメディ"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-4 mt-6">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-gray-400 hover:text-white transition"
              >
                キャンセル
              </button>
              <button
                className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90 transition"
              >
                登録する
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Video List */}
      <div className="bg-dark-lighter rounded-lg overflow-hidden">
        <div className="p-6">
          <h2 className="text-xl font-semibold text-white mb-4">アップロード済み動画</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-dark">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">タイトル</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">価格</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">アクション</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark">
              {videos.map((video) => (
                <tr key={video.id}>
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      {video.thumbnail && (
                        <img
                          src={video.thumbnail}
                          alt={video.title}
                          className="h-12 w-20 object-cover rounded"
                        />
                      )}
                      <div className="ml-4">
                        <div className="text-sm font-medium text-white">{video.title}</div>
                        <div 
                          className="text-sm text-gray-400 truncate max-w-xs" 
                          title={video.description || undefined}
                        >
                          {!video.description 
                            ? "説明なし"
                            : video.description.length > 100 
                              ? `${video.description.substring(0, 100)}...` 
                              : video.description}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-white">
                    ¥{video.price.toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => {
                          setSelectedVideo(video);
                          setIsModalOpen(true);
                        }}
                        className="p-1 text-gray-400 hover:text-white transition"
                      >
                        <Edit2 className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(video.id)}
                        className="p-1 text-gray-400 hover:text-red-500 transition"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Modal Component */}
      {selectedVideo && (
        <EditModal 
          isOpen={isModalOpen}
          video={selectedVideo}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedVideo(null);
          }}
          onSave={(updatedVideo) => {
            setVideos(videos.map(v => 
              v.id === updatedVideo.id ? updatedVideo : v
            ));
            setIsModalOpen(false);
            setSelectedVideo(null);
          }}
        />
      )}
    </div>
  );
}
