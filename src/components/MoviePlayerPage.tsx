import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactPlayer from 'react-player';
import { Play, Pause, Volume2, VolumeX, Maximize, ArrowLeft, RefreshCcw } from 'lucide-react';
import type { Database } from '../lib/types';

type Movie = Database['public']['Tables']['movies']['Row'];

export default function MoviePlayerPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [movie, setMovie] = useState<Movie | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const [played, setPlayed] = useState(0);
  const [seeking, setSeeking] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [quality, setQuality] = useState<'1080p' | '720p' | '360p'>('1080p');
  const [showControls, setShowControls] = useState(true);
  const [controlsTimeout, setControlsTimeout] = useState<NodeJS.Timeout | null>(null);

  // テスト用の動画URL
  const videoUrls = {
    '1080p': 'https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/1080/Big_Buck_Bunny_1080_10s_1MB.mp4',
    '720p': 'https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/720/Big_Buck_Bunny_720_10s_1MB.mp4', 
    '360p': 'https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/360/Big_Buck_Bunny_360_10s_1MB.mp4'
  };

  const handleQualityChange = (newQuality: '1080p' | '720p' | '360p') => {
    setQuality(newQuality);
    setIsPlaying(true);
    resetControlsTimer();
  };

  const resetControlsTimer = () => {
    setShowControls(true);
    if (controlsTimeout) {
      clearTimeout(controlsTimeout);
    }
    setControlsTimeout(setTimeout(() => setShowControls(false), 3000));
  };

  const handleMouseMove = () => {
    resetControlsTimer();
  };

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
  }, [id]);

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
    fetchMovie();
  };

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    setVolume(value);
    setIsMuted(value === 0);
  };

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    setPlayed(value);
  };

  const handleSeekMouseDown = () => {
    setSeeking(true);
  };

  const handleSeekMouseUp = (e: React.MouseEvent<HTMLInputElement>) => {
    setSeeking(false);
    const player = document.querySelector('video');
    if (player) {
      player.currentTime = played * player.duration;
    }
  };

  const handleProgress = (state: { played: number }) => {
    if (!seeking) {
      setPlayed(state.played);
    }
  };

  const handleMute = () => {
    setIsMuted(!isMuted);
    setVolume(isMuted ? 1 : 0);
  };

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
            />

            {/* Custom Controls */}
            <div 
              className={`absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-gray-900/90 to-transparent transition-opacity duration-300 ${
                showControls ? 'opacity-100' : 'opacity-0'
              }`}
            >
              {/* Progress Bar */}
              <input
                type="range"
                min={0}
                max={1}
                step="any"
                value={played}
                onChange={handleSeekChange}
                onMouseDown={handleSeekMouseDown}
                onMouseUp={handleSeekMouseUp}
                className="w-full mb-4 accent-primary"
              />

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
              <div>
                <span className="text-gray-400">評価:</span>{' '}
                <span className="text-white">{movie?.rating ? `${movie.rating}/10` : '-'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
