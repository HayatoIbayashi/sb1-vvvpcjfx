// 動画再生ページコンポーネント (ReactPlayerを使用)
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactPlayer from 'react-player';
import { Play, Pause, Volume2, VolumeX, Maximize, ArrowLeft, RefreshCcw } from 'lucide-react';
import type { Database } from '../lib/types';
import { getUrl } from 'aws-amplify/storage';
import { linkToStorageFile } from '../lib/storageUtils';

type Movie = Database['public']['Tables']['movies']['Row'];

export default function MoviePlayerPage() {
  // 動画URL取得関数 (storageUtils.ts の linkToStorageFile を使用可能)
  // ルーティング関連
  const { id } = useParams(); // URLパラメータから動画ID取得
  const navigate = useNavigate();

  // 動画データ状態
  const [movie, setMovie] = useState<Movie | null>(null);
  const [storageUrl, setStorageUrl] = useState<string>('');

  // プレーヤー制御状態
  const [isPlaying, setIsPlaying] = useState(false); // 再生/一時停止状態
  const [volume, setVolume] = useState(1); // 音量 (0-1)
  const [played, setPlayed] = useState(0); // 再生位置 (0-1)
  const [seeking, setSeeking] = useState(false); // シーク中かどうか
  const [isMuted, setIsMuted] = useState(false); // ミュート状態
  const [isFullscreen, setIsFullscreen] = useState(false); // フルスクリーン状態

  // UI状態
  const [loading, setLoading] = useState(true); // ローディング状態
  const [error, setError] = useState<string | null>(null); // エラーメッセージ
  const [retryCount, setRetryCount] = useState(0); // リトライ回数
  const [quality, setQuality] = useState<'1080p' | '720p' | '360p'>('1080p'); // 画質設定
  const [showControls, setShowControls] = useState(true); // コントロール表示状態
  const [controlsTimeout, setControlsTimeout] = useState<NodeJS.Timeout | null>(null); // コントロール非表示タイマー
  const [duration, setDuration] = useState(0); // 動画の総時間(秒)

  // 動画URL (すべての解像度で同じURLを使用)
  const videoUrls = {
    '1080p': storageUrl,
    '720p': storageUrl, 
    '360p': storageUrl,
  };

  // 画質変更ハンドラ
  const handleQualityChange = (newQuality: '1080p' | '720p' | '360p') => {
    setQuality(newQuality); // 画質設定更新
    setIsPlaying(true); // 自動再生
    resetControlsTimer(); // コントロール表示リセット
  };

  // コントロール非表示タイマーリセット
  const resetControlsTimer = () => {
    setShowControls(true); // コントロール表示
    if (controlsTimeout) {
      clearTimeout(controlsTimeout); // 既存タイマー解除
    }
    // 3秒後にコントロール非表示
    setControlsTimeout(setTimeout(() => setShowControls(false), 3000));
  };

  // 時間をHH:MM:SS形式にフォーマット
  const formatTime = (seconds: number) => {
    const date = new Date(0);
    date.setSeconds(seconds);
    return date.toISOString().substring(11, 19);
  };

  // マウス移動検知 (コントロール表示維持)
  const handleMouseMove = () => {
    resetControlsTimer();
  };

  // 動画の長さを取得
  const handleDuration = (duration: number) => {
    setDuration(duration);
  };

  // 動画データ取得
  const fetchMovie = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!movie) {
        //throw new Error('作品が見つかりませんでした');
      }

      setMovie(movie);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('Failed to fetch')) {
          setError('サーバーに接続できません。インターネット接続を確認してください。');
        } else {
          setError(error.message);
        }
      } else {
        setError('予期せぬエラーが発生しました');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMovie();

    // Amplify StorageからURLを取得
    const fetchStorageUrl = async () => {
      try {
        const url = await linkToStorageFile('public/1h無題の動画sample_output1.mp4');
        setStorageUrl(url);
        console.log('Storage URL:', url);
      } catch (error) {
        console.error('Error fetching storage URL:', error);
      }
    };

    fetchStorageUrl();
  }, [id]);

  // リトライ処理
  const handleRetry = () => {
    setRetryCount(prev => prev + 1); // リトライ回数インクリメント
    fetchMovie(); // データ再取得
  };

  // 再生/一時停止トグル
  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  // 音量変更
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    setVolume(value); // 音量設定
    setIsMuted(value === 0); // 音量0ならミュート状態に
  };

  // シークバー値変更
  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    setPlayed(value); // 再生位置更新
  };

  // シーク開始
  const handleSeekMouseDown = () => {
    setSeeking(true); // シーク中フラグON
  };

  // シーク終了
  const handleSeekMouseUp = (e: React.MouseEvent<HTMLInputElement>) => {
    setSeeking(false); // シーク中フラグOFF
    const player = document.querySelector('video');
    if (player) {
      player.currentTime = played * player.duration; // 実際の再生位置更新
    }
  };

  // 再生進捗更新
  const handleProgress = (state: { played: number }) => {
    if (!seeking) { // シーク中は更新しない
      setPlayed(state.played);
    }
  };

  // ミュートトグル
  const handleMute = () => {
    setIsMuted(!isMuted);
    setVolume(isMuted ? 1 : 0); // ミュート解除時は音量1に
  };

  // フルスクリーントグル
  const handleFullscreen = () => {
    const player = document.querySelector('.player-wrapper');
    if (!player) return;

    if (!document.fullscreenElement) {
      player.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-dark flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-dark flex items-center justify-center">
        <div className="text-white text-center max-w-md px-4">
          <p className="text-xl mb-4">{error}</p>
          <div className="flex gap-4 justify-center">
            <button
              onClick={handleRetry}
              className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary/90 transition flex items-center gap-2"
            >
              <RefreshCcw className="h-5 w-5" />
              再試行
            </button>
            <button
              onClick={() => navigate('/')}
              className="bg-gray-700 text-white px-6 py-2 rounded-lg hover:bg-gray-600 transition"
            >
              ホームに戻る
            </button>
          </div>
        </div>
      </div>
    );
  }

  // if (!movie) {
  //   return (
  //     <div className="min-h-screen bg-dark flex items-center justify-center">
  //       <div className="text-white text-center">
  //         <p className="text-xl mb-4">作品が見つかりませんでした</p>
  //         <button
  //           onClick={() => navigate('/')}
  //           className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary/90 transition"
  //         >
  //           ホームに戻る
  //         </button>
  //       </div>
  //     </div>
  //   );
  // }

  return (
      <div 
        className="min-h-screen bg-gray-900"
        onMouseMove={handleMouseMove}
      >
      {/* Header */}
      <header className="fixed top-0 w-full bg-gray-900/95 backdrop-blur-sm z-50 border-b border-gray-800">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center">
            <button
              onClick={() => navigate(-1)}
              className="text-gray-400 hover:text-white transition mr-4"
            >
              <ArrowLeft className="h-6 w-6" />
            </button>
            <h1 className="text-xl font-bold text-white">{movie?.title || 'デモ版（作品名）'}</h1>
          </div>
        </div>
      </header>

      {/* Player */}
      <div className="pt-16 pb-8">
        <div className="container mx-auto px-4">
          <div className="player-wrapper relative pt-[56.25%] bg-gray-800 rounded-lg overflow-hidden">
            <ReactPlayer
              url={videoUrls[quality]}
              className="absolute top-0 left-0"
              width="100%"
              height="100%"
              playing={isPlaying}
              volume={volume}
              muted={isMuted}
              onProgress={handleProgress}
              onDuration={handleDuration}
            />

            {/* Custom Controls */}
            <div 
              className={`absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-gray-900/90 to-transparent transition-opacity duration-300 ${
                showControls ? 'opacity-100' : 'opacity-0'
              }`}
            >
              {/* Progress Bar with Time Display */}
              <div className="relative w-full mb-4">
                {/* Current Time Tooltip */}
                <div
                  className="absolute -top-6 bg-gray-800 px-2 py-1 rounded text-white text-xs whitespace-nowrap"
                  style={{
                    left: `${played * 100}%`,
                    transform: 'translateX(-50%)'
                  }}
                >
                  {formatTime(played * duration)}
                </div>
                {/* Total Time (fixed right) */}
                <div className="absolute -top-6 right-0 text-xs text-gray-400">
                  {formatTime(duration)}
                </div>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step="any"
                  value={played}
                  onChange={handleSeekChange}
                  onMouseDown={handleSeekMouseDown}
                  onMouseUp={handleSeekMouseUp}
                  className="w-full accent-primary"
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  {/* Play/Pause */}
                  <button
                    onClick={handlePlayPause}
                    className="text-white hover:text-blue-500 transition"
                  >
                    {isPlaying ? (
                      <Pause className="h-6 w-6" />
                    ) : (
                      <Play className="h-6 w-6" />
                    )}
                  </button>

                  {/* Volume & Quality */}
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={handleMute}
                        className="text-white hover:text-blue-500 transition"
                      >
                        {isMuted ? (
                          <VolumeX className="h-6 w-6" />
                        ) : (
                          <Volume2 className="h-6 w-6" />
                        )}
                      </button>
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step="any"
                        value={volume}
                        onChange={handleVolumeChange}
                        className="w-20 accent-primary"
                      />
                    </div>
                    <select
                      value={quality}
                      onChange={(e) => handleQualityChange(e.target.value as '1080p' | '720p' | '360p')}
                      className="bg-gray-800 text-white text-sm rounded px-2 py-1"
                    >
                      <option value="1080p">1080p</option>
                      <option value="720p">720p</option>
                      <option value="360p">360p</option>
                    </select>
                  </div>
                </div>

                {/* Fullscreen */}
                <button
                  onClick={handleFullscreen}
                  className="text-white hover:text-blue-500 transition"
                >
                  <Maximize className="h-6 w-6" />
                </button>
              </div>
            </div>
          </div>

          {/* Movie Info */}
          <div className="mt-8">
            <h2 className="text-2xl font-bold text-white mb-4">{movie?.title || ''}</h2>
            <p className="text-gray-400 mb-4">{movie?.description || ''}</p>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-400">監督:</span>{' '}
                <span className="text-white">{movie?.director || '-'}</span>
              </div>
              <div>
                <span className="text-gray-400">時間:</span>{' '}
                <span className="text-white">{movie?.duration || '-'}</span>
              </div>
              <div>
                <span className="text-gray-400">公開年:</span>{' '}
                <span className="text-white">{movie?.release_year || '-'}</span>
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
