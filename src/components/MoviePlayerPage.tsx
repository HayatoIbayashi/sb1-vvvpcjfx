import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import ReactPlayer from 'react-player';
import { ArrowLeft, Maximize, Pause, Play, RefreshCcw, Volume2, VolumeX } from 'lucide-react';
import type { Database } from '../lib/types';
import { AWS_SAMPLE_VIDEO_STORAGE_PATH, linkToStorageFile } from '../lib/storageUtils';
import useApiClient from '../lib/useApiClient';
import { useAuthStatus } from '../lib/authBridge';
import { MOCK_MOVIES } from '../mockData';
import { getLocalMockMovie } from '../lib/mockMovieResolver';
import { useMembershipStatus } from '../lib/useMembershipStatus';
import { getMovieGenreSummary, getPrimaryMovieGenre } from '../lib/movieGenres';
import { canAccessMovie, getMovieAccessTier, getMovieBuyPrice, getMovieCurrency } from '../lib/movieAccess';

type Movie = Database['public']['Tables']['movies']['Row'];

export default function MoviePlayerPage() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const api = useApiClient();
  const { isAuthenticated } = useAuthStatus();
  const { accessState, isLoading: isMembershipLoading } = useMembershipStatus();
  const useMockMovies = import.meta.env.VITE_USE_MOCK_MOVIES === 'true';
  const useMockWatchHistory = import.meta.env.VITE_USE_MOCK_WATCH_HISTORY === 'true';
  const shouldAutoplay = useMemo(
    () => new URLSearchParams(location.search).get('autoplay') === '1',
    [location.search],
  );
  const localMockMovie = useMemo(() => getLocalMockMovie(id), [id]);
  const shouldUseLocalMockMovie = useMemo(
    () => !!localMockMovie && !useMockMovies,
    [localMockMovie, useMockMovies],
  );

  const [movie, setMovie] = useState<Movie | null>(null);
  const [storageUrl, setStorageUrl] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const [played, setPlayed] = useState(0);
  const [seeking, setSeeking] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quality, setQuality] = useState<'1080p' | '720p' | '360p'>('1080p');
  const [showControls, setShowControls] = useState(true);
  const [controlsTimeout, setControlsTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [duration, setDuration] = useState(0);
  const [hasPurchasedMovie, setHasPurchasedMovie] = useState(false);
  const [isPurchaseLoading, setIsPurchaseLoading] = useState(false);
  const hasRecordedWatchHistoryRef = useRef(false);

  const canWatchMovie = movie ? canAccessMovie(accessState, movie, { hasPurchased: hasPurchasedMovie }) : false;
  const videoUrls = {
    '1080p': storageUrl,
    '720p': storageUrl,
    '360p': storageUrl,
  };

  const resetControlsTimer = useCallback(() => {
    setShowControls(true);
    if (controlsTimeout) {
      clearTimeout(controlsTimeout);
    }
    setControlsTimeout(setTimeout(() => setShowControls(false), 3000));
  }, [controlsTimeout]);

  useEffect(() => {
    return () => {
      if (controlsTimeout) {
        clearTimeout(controlsTimeout);
      }
    };
  }, [controlsTimeout]);

  const formatTime = (seconds: number) => {
    const date = new Date(0);
    date.setSeconds(seconds);
    return date.toISOString().substring(11, 19);
  };

  const handleQualityChange = (newQuality: '1080p' | '720p' | '360p') => {
    setQuality(newQuality);
    setIsPlaying(true);
    resetControlsTimer();
  };

  const fetchMovie = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      if (!id) {
        throw new Error('movie id is required');
      }

      if (useMockMovies || shouldUseLocalMockMovie) {
        const foundMovie = localMockMovie ?? MOCK_MOVIES.find((item) => item.id === id);
        if (!foundMovie) {
          throw new Error('movie not found');
        }
        setMovie(foundMovie);
        return;
      }

      try {
        const item = await api.getMovie(id);
        setMovie(item);
      } catch (fetchError) {
        if (localMockMovie) {
          setMovie(localMockMovie);
          return;
        }

        throw fetchError;
      }
    } catch (fetchError) {
      if (fetchError instanceof Error) {
        if (fetchError.message.includes('Failed to fetch')) {
          setError('サーバーに接続できません。ネットワーク設定を確認してください。');
        } else {
          setError(fetchError.message);
        }
      } else {
        setError('予期しないエラーが発生しました。');
      }
    } finally {
      setLoading(false);
    }
  }, [api, id, localMockMovie, shouldUseLocalMockMovie, useMockMovies]);

  const fetchStorageUrl = useCallback(async () => {
    try {
      const url = await linkToStorageFile(AWS_SAMPLE_VIDEO_STORAGE_PATH);
      setStorageUrl(url);
    } catch (storageError) {
      console.error('Error fetching storage URL:', storageError);
      setError('AWS 上のサンプル動画の取得に失敗しました。');
    }
  }, []);

  useEffect(() => {
    void fetchMovie();
    void fetchStorageUrl();
  }, [fetchMovie, fetchStorageUrl]);

  useEffect(() => {
    let cancelled = false;

    const loadPurchaseStatus = async () => {
      if (!isAuthenticated || !movie?.id) {
        if (!cancelled) {
          setHasPurchasedMovie(false);
          setIsPurchaseLoading(false);
        }
        return;
      }

      const accessTier = getMovieAccessTier(movie);
      const requiresPurchaseCheck = accessTier === 'purchase' || accessTier === 'subscription_or_purchase';
      if (!requiresPurchaseCheck) {
        if (!cancelled) {
          setHasPurchasedMovie(false);
          setIsPurchaseLoading(false);
        }
        return;
      }

      if (!cancelled) {
        setIsPurchaseLoading(true);
      }

      try {
        const result = await api.getPurchases({ movieId: movie.id, status: 'completed', limit: 1 });
        if (!cancelled) {
          setHasPurchasedMovie(result.items.length > 0);
        }
      } catch (purchaseError) {
        console.error('Error fetching purchase status:', purchaseError);
        if (!cancelled) {
          setHasPurchasedMovie(false);
        }
      } finally {
        if (!cancelled) {
          setIsPurchaseLoading(false);
        }
      }
    };

    void loadPurchaseStatus();
    return () => {
      cancelled = true;
    };
  }, [api, isAuthenticated, movie]);

  useEffect(() => {
    hasRecordedWatchHistoryRef.current = false;
  }, [movie?.id]);

  useEffect(() => {
    if (!shouldAutoplay || !storageUrl || !canWatchMovie) {
      return;
    }

    setIsPlaying(true);
  }, [canWatchMovie, shouldAutoplay, storageUrl]);

  useEffect(() => {
    const recordWatchHistory = async () => {
      if (
        !isPlaying
        || !movie?.id
        || !isAuthenticated
        || accessState === 'guest'
        || !canWatchMovie
        || hasRecordedWatchHistoryRef.current
      ) {
        return;
      }

      if (useMockWatchHistory) {
        try {
          const key = 'mock_watch_history_v1';
          const raw = localStorage.getItem(key);
          const current = raw
            ? (JSON.parse(raw) as Array<{ id: string; title: string; watchedAt: string }>)
            : [];
          const next = [
            {
              id: movie.id,
              title: movie.title,
              watchedAt: new Date().toISOString(),
            },
            ...current.filter((item) => item.id !== movie.id),
          ];
          localStorage.setItem(key, JSON.stringify(next));
          hasRecordedWatchHistoryRef.current = true;
        } catch (historyError) {
          console.error('Error saving mock watch history:', historyError);
        }
        return;
      }

      if (getLocalMockMovie(movie.id)) {
        hasRecordedWatchHistoryRef.current = true;
        return;
      }

      try {
        await api.addWatchHistory(movie.id);
        hasRecordedWatchHistoryRef.current = true;
      } catch (historyError) {
        console.error('Error recording watch history:', historyError);
      }
    };

    void recordWatchHistory();
  }, [api, accessState, canWatchMovie, isAuthenticated, isPlaying, movie, useMockWatchHistory]);

  const handleRetry = () => {
    setStorageUrl('');
    setIsPlaying(false);
    void fetchMovie();
    void fetchStorageUrl();
  };

  const handlePlayPause = () => {
    setIsPlaying((current) => !current);
  };

  const handleVolumeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(event.target.value);
    setVolume(value);
    setIsMuted(value === 0);
  };

  const handleSeekChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setPlayed(parseFloat(event.target.value));
  };

  const handleSeekMouseDown = () => {
    setSeeking(true);
  };

  const handleSeekMouseUp = () => {
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
    setIsMuted((current) => !current);
    setVolume((current) => (current === 0 ? 1 : 0));
  };

  const handleFullscreen = () => {
    const player = document.querySelector('.player-wrapper');
    if (!player) {
      return;
    }

    if (!document.fullscreenElement) {
      void player.requestFullscreen();
    } else {
      void document.exitFullscreen();
    }
  };

  const isPlayerPreparing = !!movie && canWatchMovie && !storageUrl && !error;

  if (loading || (isAuthenticated && (isMembershipLoading || isPurchaseLoading)) || isPlayerPreparing) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-900">
        <div className="text-center text-white">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-white"></div>
          {isPlayerPreparing && <p className="mt-4 text-sm text-gray-300">サンプル動画を準備しています...</p>}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-900">
        <div className="max-w-md px-4 text-center text-white">
          <p className="mb-4 text-xl">{error}</p>
          <div className="flex justify-center gap-4">
            <button
              onClick={handleRetry}
              className="flex items-center gap-2 rounded-lg bg-primary px-6 py-2 text-white transition hover:bg-primary/90"
            >
              <RefreshCcw className="h-5 w-5" />
              再試行
            </button>
            <button
              onClick={() => navigate('/')}
              className="rounded-lg bg-gray-700 px-6 py-2 text-white transition hover:bg-gray-600"
            >
              ホームに戻る
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!movie) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-900 text-white">
        <p className="text-lg">動画が見つかりません。</p>
      </div>
    );
  }

  if (!canWatchMovie) {
    const title = movie.title ? `「${movie.title}」の視聴には` : '視聴には';
    const buyPrice = getMovieBuyPrice(movie);
    const currency = getMovieCurrency(movie);

    return (
      <div className="min-h-screen bg-gray-900 text-white">
        <header className="border-b border-gray-800 bg-gray-900/95 backdrop-blur-sm">
          <div className="container mx-auto flex items-center gap-4 px-4 py-4">
            <button onClick={() => navigate(-1)} className="text-gray-400 transition hover:text-white">
              <ArrowLeft className="h-6 w-6" />
            </button>
            <h1 className="text-xl font-bold">{movie.title || '動画再生'}</h1>
          </div>
        </header>

        <main className="container mx-auto px-4 py-16">
          <div className="mx-auto max-w-2xl rounded-2xl border border-amber-400/30 bg-amber-500/10 p-8 text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-amber-200">Access Required</p>
            <h2 className="mt-4 text-3xl font-bold text-white">{title}条件があります</h2>
            <p className="mt-4 text-base leading-7 text-amber-50/90">
              {accessState === 'guest'
                ? 'この作品はログイン後、購入済みの場合に視聴できます。まずログインしてください。'
                : 'この作品は購入済みの場合に視聴できます。'}
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              {accessState === 'guest' ? (
                <>
                  <button
                    onClick={() => navigate('/signup')}
                    className="rounded-xl bg-white px-6 py-3 font-semibold text-gray-900 transition hover:bg-gray-100"
                  >
                    会員登録する
                  </button>
                  <button
                    onClick={() => navigate('/login')}
                    className="rounded-xl border border-gray-600 px-6 py-3 font-semibold text-white transition hover:bg-gray-800"
                  >
                    ログイン
                  </button>
                </>
              ) : (
                <div
                  className="rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-pink-500 px-6 py-3 font-semibold text-white"
                >
                  <span>この動画は購入が必要です</span>
                  {buyPrice > 0 && (
                    <span className="ml-3 text-sm font-medium text-white/90">
                      {currency === 'JPY' ? `¥${buyPrice.toLocaleString()}` : `${buyPrice.toLocaleString()} ${currency}`}
                    </span>
                  )}
                </div>
              )}
              <div className="rounded-full border border-white/10 px-4 py-2 text-sm text-gray-200">
                {getPrimaryMovieGenre(movie)}
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900" onMouseMove={resetControlsTimer}>
      <header className="fixed top-0 z-50 w-full border-b border-gray-800 bg-gray-900/95 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center">
            <button onClick={() => navigate(-1)} className="mr-4 text-gray-400 transition hover:text-white">
              <ArrowLeft className="h-6 w-6" />
            </button>
            <h1 className="text-xl font-bold text-white">{movie.title || '動画プレイヤー'}</h1>
          </div>
        </div>
      </header>

      <div className="pb-8 pt-16">
        <div className="container mx-auto px-4">
          <div className="player-wrapper relative overflow-hidden rounded-lg bg-gray-800 pt-[56.25%]">
            <ReactPlayer
              url={videoUrls[quality]}
              className="absolute left-0 top-0"
              width="100%"
              height="100%"
              playing={isPlaying}
              volume={volume}
              muted={isMuted}
              onProgress={handleProgress}
              onDuration={setDuration}
            />

            <div
              className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-gray-900/90 to-transparent p-4 transition-opacity duration-300 ${
                showControls ? 'opacity-100' : 'opacity-0'
              }`}
            >
              <div className="relative mb-4 w-full">
                <div
                  className="absolute -top-6 rounded bg-gray-800 px-2 py-1 text-xs text-white"
                  style={{
                    left: `${played * 100}%`,
                    transform: 'translateX(-50%)',
                  }}
                >
                  {formatTime(played * duration)}
                </div>
                <div className="absolute -top-6 right-0 text-xs text-gray-400">{formatTime(duration)}</div>
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
                  <button
                    onClick={handlePlayPause}
                    aria-label={isPlaying ? '一時停止' : '再生'}
                    className="text-white transition hover:text-blue-500"
                  >
                    {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
                  </button>

                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={handleMute}
                        aria-label={isMuted ? 'ミュート解除' : 'ミュート'}
                        className="text-white transition hover:text-blue-500"
                      >
                        {isMuted ? <VolumeX className="h-6 w-6" /> : <Volume2 className="h-6 w-6" />}
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
                      onChange={(event) => handleQualityChange(event.target.value as '1080p' | '720p' | '360p')}
                      className="rounded bg-gray-800 px-2 py-1 text-sm text-white"
                    >
                      <option value="1080p">1080p</option>
                      <option value="720p">720p</option>
                      <option value="360p">360p</option>
                    </select>
                  </div>
                </div>

                <button
                  onClick={handleFullscreen}
                  aria-label="全画面表示"
                  className="text-white transition hover:text-blue-500"
                >
                  <Maximize className="h-6 w-6" />
                </button>
              </div>
            </div>
          </div>

          <div className="mt-8">
            <h2 className="mb-4 text-2xl font-bold text-white">{movie.title}</h2>
            <p className="mb-4 text-gray-400">{movie.description || ''}</p>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-400">監督:</span>{' '}
                <span className="text-white">{movie.director || '-'}</span>
              </div>
              <div>
                <span className="text-gray-400">再生時間:</span>{' '}
                <span className="text-white">{movie.duration || '-'}</span>
              </div>
              <div>
                <span className="text-gray-400">公開年:</span>{' '}
                <span className="text-white">{movie.release_year || '-'}</span>
              </div>
              <div>
                <span className="text-gray-400">ジャンル:</span>{' '}
                <span className="text-white">{getMovieGenreSummary(movie)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
