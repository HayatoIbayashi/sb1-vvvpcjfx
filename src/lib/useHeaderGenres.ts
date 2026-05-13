import { useEffect, useState } from 'react';
import { MOCK_MOVIES } from '../mockData';
import { getMovieGenreOptions } from './movieGenres';
import useApiClient from './useApiClient';

export function useHeaderGenres() {
  const api = useApiClient();
  const useMockMovies = import.meta.env.VITE_USE_MOCK_MOVIES === 'true';
  const [genreOptions, setGenreOptions] = useState<string[]>(() => getMovieGenreOptions(MOCK_MOVIES));

  useEffect(() => {
    let cancelled = false;

    const loadGenres = async () => {
      try {
        if (useMockMovies) {
          if (!cancelled) {
            setGenreOptions(getMovieGenreOptions(MOCK_MOVIES));
          }
          return;
        }

        const result = await api.getMovies();
        if (!cancelled) {
          setGenreOptions(getMovieGenreOptions(result.items));
        }
      } catch (error) {
        console.error('Error fetching header genres:', error);
        if (!cancelled) {
          setGenreOptions(getMovieGenreOptions(MOCK_MOVIES));
        }
      }
    };

    void loadGenres();
    return () => {
      cancelled = true;
    };
  }, [api, useMockMovies]);

  return genreOptions;
}

export default useHeaderGenres;
