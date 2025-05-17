import { useState } from 'react';
import { Upload, Edit2, Trash2, Eye, EyeOff } from 'lucide-react';

interface Video {
  id: string;
  title: string;
  description: string;
  price: number;
  isPublished: boolean;
  publishStartDate: string;
  publishEndDate: string;
  thumbnailUrl: string;
  videoUrl: string;
  createdAt: string;
}

const MOCK_VIDEOS: Video[] = [
  {
    id: '1',
    title: 'インセプション',
    description: '夢の中で情報を盗む特殊な技術を持つ男が、今度は逆に思考を植え付ける危険なミッションに挑む。',
    price: 500,
    isPublished: true,
    publishStartDate: '2024-03-01',
    publishEndDate: '2025-03-01',
    thumbnailUrl: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800',
    videoUrl: 'https://example.com/video1.mp4',
    createdAt: '2024-03-01T10:00:00Z'
  },
  {
    id: '2',
    title: 'アバター',
    description: '人類が新たな惑星を開拓しようとする中、原住民との間で繰り広げられる壮大な物語。',
    price: 800,
    isPublished: false,
    publishStartDate: '2024-04-01',
    publishEndDate: '2025-04-01',
    thumbnailUrl: 'https://images.unsplash.com/photo-1518709766631-a6a7f45921c3?w=800',
    videoUrl: 'https://example.com/video2.mp4',
    createdAt: '2024-03-02T10:00:00Z'
  }
];

export function VideoManagement() {
  const [videos, setVideos] = useState<Video[]>(MOCK_VIDEOS);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
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

  const handlePublishToggle = (videoId: string) => {
    setVideos(videos.map(video =>
      video.id === videoId
        ? { ...video, isPublished: !video.isPublished }
        : video
    ));
  };

  const handleDelete = (videoId: string) => {
    if (confirm('本当にこの動画を削除しますか？')) {
      setVideos(videos.filter(video => video.id !== videoId));
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <div className="bg-dark-lighter p-6 rounded-lg">
        <h2 className="text-xl font-semibold text-white mb-4">動画のアップロード</h2>
        <div className="border-2 border-dashed border-dark-light rounded-lg p-8 text-center">
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
            <span className="text-gray-400">クリックまたはドラッグ＆ドロップで動画をアップロード</span>
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">ステータス</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">価格</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">公開期間</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">アクション</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark">
              {videos.map((video) => (
                <tr key={video.id}>
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <img
                        src={video.thumbnailUrl}
                        alt={video.title}
                        className="h-12 w-20 object-cover rounded"
                      />
                      <div className="ml-4">
                        <div className="text-sm font-medium text-white">{video.title}</div>
                        <div className="text-sm text-gray-400">{video.description}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs font-medium rounded ${
                      video.isPublished
                        ? 'bg-green-500/10 text-green-500'
                        : 'bg-gray-500/10 text-gray-400'
                    }`}>
                      {video.isPublished ? '公開中' : '非公開'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-white">
                    ¥{video.price.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-400">
                    {video.publishStartDate} 〜 {video.publishEndDate}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handlePublishToggle(video.id)}
                        className="p-1 text-gray-400 hover:text-white transition"
                      >
                        {video.isPublished ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
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

      {/* Edit Modal */}
      {isModalOpen && selectedVideo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-dark-lighter p-6 rounded-lg w-full max-w-2xl">
            <h3 className="text-xl font-semibold text-white mb-4">動画情報の編集</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  タイトル
                </label>
                <input
                  type="text"
                  value={selectedVideo.title}
                  className="w-full px-3 py-2 bg-dark rounded border border-dark-light text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  説明
                </label>
                <textarea
                  value={selectedVideo.description}
                  rows={3}
                  className="w-full px-3 py-2 bg-dark rounded border border-dark-light text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">
                    価格
                  </label>
                  <input
                    type="number"
                    value={selectedVideo.price}
                    className="w-full px-3 py-2 bg-dark rounded border border-dark-light text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">
                    公開状態
                  </label>
                  <select
                    value={selectedVideo.isPublished ? 'published' : 'draft'}
                    className="w-full px-3 py-2 bg-dark rounded border border-dark-light text-white"
                  >
                    <option value="published">公開</option>
                    <option value="draft">非公開</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">
                    公開開始日
                  </label>
                  <input
                    type="date"
                    value={selectedVideo.publishStartDate}
                    className="w-full px-3 py-2 bg-dark rounded border border-dark-light text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">
                    公開終了日
                  </label>
                  <input
                    type="date"
                    value={selectedVideo.publishEndDate}
                    className="w-full px-3 py-2 bg-dark rounded border border-dark-light text-white"
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
                onClick={() => {
                  // Handle save
                  setIsModalOpen(false);
                }}
                className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90 transition"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}