import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import type { Location } from 'react-router-dom';
import type { Database } from '../lib/types';
import useApiClient from '../lib/useApiClient';
import { loadMovieById } from '../lib/movieLoader';
import { getMatchingWarningGenres, getStoredWarningGenreLabels } from '../lib/warningPreferences';
import MovieDetailPage from './MovieDetailPage';

type Movie = Database['public']['Tables']['movies']['Row'];

type MovieDetailLocationState = {
  from?: Location;
};

export default function MovieDetailRouteGuard() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const api = useApiClient();
  const useMockMovies = import.meta.env.VITE_USE_MOCK_MOVIES === 'true';
  const [movie, setMovie] = useState<Movie | null>(null);
  const [status, setStatus] = useState<'loading' | 'warning' | 'ready' | 'passthrough'>('loading');
  const [matchingGenres, setMatchingGenres] = useState<string[]>([]);

  const state = location.state as MovieDetailLocationState | null;
  const returnTo = state?.from;

  useEffect(() => {
    let cancelled = false;

    const loadMovie = async () => {
      if (!id) {
        if (!cancelled) {
          setStatus('passthrough');
        }
        return;
      }

      try {
        const resolvedMovie = await loadMovieById({ api, id, useMockMovies });
        if (cancelled) return;

        if (!resolvedMovie) {
          setStatus('ready');
          return;
        }

        const nextMatchingGenres = getMatchingWarningGenres(
          resolvedMovie,
          getStoredWarningGenreLabels(),
        );

        setMovie(resolvedMovie);
        setMatchingGenres(nextMatchingGenres);
        setStatus(nextMatchingGenres.length > 0 ? 'warning' : 'ready');
      } catch (error) {
        console.error('Error resolving movie detail warning state:', error);
        if (!cancelled) {
          setStatus('passthrough');
        }
      }
    };

    void loadMovie();

    return () => {
      cancelled = true;
    };
  }, [api, id, useMockMovies]);

  const handleClose = () => {
    if (returnTo) {
      navigate(
        {
          pathname: returnTo.pathname,
          search: returnTo.search,
          hash: returnTo.hash,
        },
        { replace: true },
      );
      return;
    }

    navigate('/', { replace: true });
  };

  const modal = useMemo(
    () => (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="warning-dialog-title"
          className="w-full max-w-md rounded-2xl border border-amber-400/30 bg-gray-900 p-6 shadow-2xl"
        >
          <h2 id="warning-dialog-title" className="text-xl font-bold text-white">
            警告
          </h2>
          <p className="mt-3 text-sm leading-6 text-gray-200">
            この動画は警告設定をしているジャンルの映画です。
          </p>
          {matchingGenres.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {matchingGenres.map((genre) => (
                <span
                  key={genre}
                  className="rounded-full border border-amber-400/30 bg-amber-500/10 px-2.5 py-1 text-xs text-amber-100"
                >
                  {genre}
                </span>
              ))}
            </div>
          )}
          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="rounded-lg border border-gray-600 px-4 py-2 text-sm font-semibold text-gray-200 hover:bg-gray-800"
            >
              閉じる
            </button>
            <button
              type="button"
              onClick={() => setStatus('ready')}
              className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-gray-950 hover:bg-amber-400"
            >
              無視して視聴する
            </button>
          </div>
        </div>
      </div>
    ),
    [matchingGenres],
  );

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-900">
        <div className="text-center text-white">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-white"></div>
        </div>
      </div>
    );
  }

  if (status === 'warning') {
    return (
      <>
        <MovieDetailPage initialMovie={movie} />
        {modal}
      </>
    );
  }

  if (status === 'ready') {
    return <MovieDetailPage initialMovie={movie} />;
  }

  return <MovieDetailPage />;
}
