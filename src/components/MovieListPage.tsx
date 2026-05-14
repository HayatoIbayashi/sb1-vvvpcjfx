import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import type { Database } from '../lib/types';
import { MOCK_MOVIES } from '../mockData';
import useApiClient from '../lib/useApiClient';
import type { HomePageData, MovieListItem, Purchase } from '../lib/apiClient';
import { useAuthStatus } from '../lib/authBridge';
import { getTestMovieThumbnail } from '../lib/testMovieThumbnails';
import {
  getHomeMemberCatalogFallbackItems,
  getHomePublicCatalogFallbackItems,
} from './homeDisplaySamples';
import { getMovieGenres, getMovieGenreSummary, getPrimaryMovieGenre } from '../lib/movieGenres';
import {
  getRecommendationGenreLabels,
  getRecommendationGenreSectionTitle,
  matchesRecommendationGenre,
} from '../lib/recommendationPreferenceMaster';
import {
  canAccessMovie,
  getMovieAccessBadgeClass,
  getMovieAccessTier,
  partitionMoviesByAccess,
} from '../lib/movieAccess';
import { MEMBERSHIP_MONTHLY_PRICE, type MembershipAccessState } from '../lib/useMembershipStatus';
import useHeaderGenres from '../lib/useHeaderGenres';
import { Header } from './common/Header';

type Movie = Database['public']['Tables']['movies']['Row'];
type DisplayMovie = Movie | MovieListItem;
type GenreCard = {
  name: string;
  representativeMovie: DisplayMovie;
  movieCount: number;
};
type HomeCarouselSectionId = 'featured' | 'new-arrivals' | 'purchased' | 'watchlist';

const LS_RECOMMENDATION_PREFERENCES = 'account_recommendation_preferences_v1';

function getGenreItemsPerPage(width: number) {
  if (width >= 1280) return 5;
  if (width >= 1024) return 4;
  if (width >= 768) return 3;
  if (width >= 640) return 2;
  return 1;
}

function getNewArrivalItemsPerPage(width: number) {
  if (width >= 768) return 3;
  if (width >= 640) return 2;
  return 1;
}

function getPublishAt(movie: DisplayMovie) {
  return 'publish_at' in movie ? movie.publish_at ?? null : null;
}

function toSortableTimestamp(value?: string | null) {
  if (!value) return Number.NEGATIVE_INFINITY;
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? Number.NEGATIVE_INFINITY : timestamp;
}

function toMovieListItem(movie: Movie): MovieListItem {
  return {
    ...movie,
    average_rating: null,
    review_count: 0,
  };
}

function getStoredDesiredGenreIds() {
  try {
    const raw = localStorage.getItem(LS_RECOMMENDATION_PREFERENCES);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { desiredGenreIds?: unknown };
    return Array.isArray(parsed?.desiredGenreIds)
      ? parsed.desiredGenreIds.filter((value): value is string => typeof value === 'string')
      : [];
  } catch {
    return [];
  }
}

function getHomeFeaturedOrder(movie: DisplayMovie) {
  return typeof movie.home_featured_order === 'number'
    ? movie.home_featured_order
    : Number.POSITIVE_INFINITY;
}

function pickFeaturedMovies<T extends DisplayMovie>(movies: T[]) {
  return movies
    .filter((movie) => movie.is_home_featured)
    .slice()
    .sort((left, right) => {
      const featuredOrderDiff = getHomeFeaturedOrder(left) - getHomeFeaturedOrder(right);
      if (featuredOrderDiff !== 0) return featuredOrderDiff;

      const publishDiff = toSortableTimestamp(getPublishAt(right)) - toSortableTimestamp(getPublishAt(left));
      if (publishDiff !== 0) return publishDiff;

      return toSortableTimestamp(right.created_at) - toSortableTimestamp(left.created_at);
    });
}

function getMovieByLoopIndex<T extends DisplayMovie>(movies: T[], index: number) {
  if (!movies.length) {
    return null;
  }

  return movies[index % movies.length] ?? null;
}

function renderReleaseDate(releaseDate?: string | null) {
  if (!releaseDate) return null;

  return (
    <p className="text-xs font-medium text-gray-400">
      <span>{'\u516c\u958b\u65e5\uff1a'}</span>
      {releaseDate}
    </p>
  );
}

function toCarouselMovieFromPurchase(
  purchase: Purchase,
  movieMap: Map<string, MovieListItem>,
): MovieListItem {
  const existingMovie = movieMap.get(purchase.movie_id);
  if (existingMovie) return existingMovie;

  return {
    id: purchase.movie_id,
    title: purchase.title ?? '\u8cfc\u5165\u3057\u305f\u52d5\u753b',
    description: '',
    thumbnail: purchase.thumbnail ?? null,
    thumbnail_top: purchase.thumbnail ?? null,
    thumbnail_detail: purchase.thumbnail ?? null,
    release_date: null,
    duration: null,
    genre: [],
    cast: [],
    director: null,
    release_year: null,
    created_at: purchase.created_at,
    updated_at: purchase.updated_at,
    price: purchase.amount_total,
    rental_price: 0,
    access_mode: 'purchase_only',
    buy_price: purchase.amount_total,
    currency: purchase.currency,
    stripe_price_id_one_time: null,
    is_home_featured: false,
    home_featured_order: null,
    average_rating: null,
    review_count: 0,
  };
}

export default function MovieListPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, logoutAll } = useAuthStatus();
  const [movies, setMovies] = useState<MovieListItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sampleGenreLabels, setSampleGenreLabels] = useState<string[]>(() =>
    getRecommendationGenreLabels(getStoredDesiredGenreIds()),
  );
  const [desiredGenreIds, setDesiredGenreIds] = useState<string[]>(() => getStoredDesiredGenreIds());
  const [accessState, setAccessState] = useState<MembershipAccessState>(
    isAuthenticated ? 'registered' : 'guest',
  );
  const [purchasedMovies, setPurchasedMovies] = useState<MovieListItem[]>([]);
  const [watchlistMovies, setWatchlistMovies] = useState<MovieListItem[]>([]);
  const [activeHomeCarouselPages, setActiveHomeCarouselPages] = useState<Record<HomeCarouselSectionId, number>>({
    featured: 0,
    'new-arrivals': 0,
    purchased: 0,
    watchlist: 0,
  });
  const [activeDesiredGenrePages, setActiveDesiredGenrePages] = useState<Record<string, number>>({});
  const [activeGenrePage, setActiveGenrePage] = useState(0);
  const [newArrivalItemsPerPage, setNewArrivalItemsPerPage] = useState(() =>
    typeof window === 'undefined' ? 3 : getNewArrivalItemsPerPage(window.innerWidth),
  );
  const [genreItemsPerPage, setGenreItemsPerPage] = useState(() =>
    typeof window === 'undefined' ? 5 : getGenreItemsPerPage(window.innerWidth),
  );
  const api = useApiClient();
  const useMockMovies = import.meta.env.VITE_USE_MOCK_MOVIES === 'true';
  const homeCarouselRefs = useRef<Record<HomeCarouselSectionId, HTMLDivElement | null>>({
    featured: null,
    'new-arrivals': null,
    purchased: null,
    watchlist: null,
  });
  const desiredGenreCarouselRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const genreCarouselRef = useRef<HTMLDivElement | null>(null);

  const handleSearchSubmit = () => {
    const trimmed = searchQuery.trim();
    if (!trimmed) return;
    navigate(`/search?q=${encodeURIComponent(trimmed)}`);
  };

  useEffect(() => {
    let cancelled = false;

    const applyStoredRecommendations = () => {
      const storedDesiredGenreIds = getStoredDesiredGenreIds();
      if (!cancelled) {
        setDesiredGenreIds(storedDesiredGenreIds);
        setSampleGenreLabels(getRecommendationGenreLabels(storedDesiredGenreIds));
      }
    };

    const applyHomeData = (result: HomePageData) => {
      if (cancelled) return;
      setMovies(result.movies);
      setAccessState(result.accessState);
      setDesiredGenreIds(result.desiredGenreIds);

      if (isAuthenticated) {
        setSampleGenreLabels(getRecommendationGenreLabels(result.desiredGenreIds));
        return;
      }

      applyStoredRecommendations();
    };

    const loadHomeData = async () => {
      if (useMockMovies) {
        if (!cancelled) {
          setMovies(MOCK_MOVIES.map(toMovieListItem));
          setAccessState(isAuthenticated ? 'registered' : 'guest');
          setPurchasedMovies([]);
          setWatchlistMovies([]);
        }
        applyStoredRecommendations();
        return;
      }

      applyStoredRecommendations();

      try {
        const result = await api.getHomePageData();
        applyHomeData(result);

        if (!isAuthenticated || cancelled) {
          if (!cancelled) {
            setPurchasedMovies([]);
            setWatchlistMovies([]);
          }
          return;
        }

        const movieMap = new Map(result.movies.map((movie) => [movie.id, movie] as const));
        const [purchasesResult, watchlistResult] = await Promise.allSettled([
          api.getPurchases({ status: 'completed' }),
          api.getWatchlist(),
        ]);

        if (cancelled) return;

        if (purchasesResult.status === 'fulfilled') {
          setPurchasedMovies(
            purchasesResult.value.items.map((purchase) => toCarouselMovieFromPurchase(purchase, movieMap)),
          );
        } else {
          console.error('Error fetching purchased movies for home page:', purchasesResult.reason);
          setPurchasedMovies([]);
        }

        if (watchlistResult.status === 'fulfilled') {
          setWatchlistMovies(watchlistResult.value.items.map(toMovieListItem));
        } else {
          console.error('Error fetching watchlist for home page:', watchlistResult.reason);
          setWatchlistMovies([]);
        }
      } catch (error) {
        console.error('Error fetching home page data:', error);
        if (!cancelled) {
          setMovies(MOCK_MOVIES.map(toMovieListItem));
          setAccessState(isAuthenticated ? 'registered' : 'guest');
          setPurchasedMovies([]);
          setWatchlistMovies([]);
        }
      }
    };

    void loadHomeData();
    return () => {
      cancelled = true;
    };
  }, [api, isAuthenticated, useMockMovies]);

  useEffect(() => {
    const handleResize = () => {
      setNewArrivalItemsPerPage(getNewArrivalItemsPerPage(window.innerWidth));
      setGenreItemsPerPage(getGenreItemsPerPage(window.innerWidth));
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const { publicMovies, memberMovies } = partitionMoviesByAccess(movies);
  const newArrivalMovies = useMemo(
    () =>
      movies
        .slice()
        .sort((left, right) => {
          const publishDiff = toSortableTimestamp(getPublishAt(right)) - toSortableTimestamp(getPublishAt(left));
          if (publishDiff !== 0) return publishDiff;
          return toSortableTimestamp(right.created_at) - toSortableTimestamp(left.created_at);
        })
        .slice(0, 10),
    [movies],
  );
  const topRated = useMemo(
    () =>
      movies
        .filter((movie) => movie.average_rating != null && movie.review_count > 0)
        .slice()
        .sort((left, right) => {
          const averageDiff = (right.average_rating ?? 0) - (left.average_rating ?? 0);
          if (averageDiff !== 0) return averageDiff;
          const reviewCountDiff = right.review_count - left.review_count;
          if (reviewCountDiff !== 0) return reviewCountDiff;
          return left.title.localeCompare(right.title, 'ja');
        })
        .slice(0, 10),
    [movies],
  );
  const availableNowMovies = movies.filter((movie) => canAccessMovie(accessState, movie));
  const heroMovie = availableNowMovies[0] ?? publicMovies[0] ?? memberMovies[0] ?? movies[0] ?? null;
  const publicCatalogFallbackItems = useMemo(
    () => getHomePublicCatalogFallbackItems(sampleGenreLabels),
    [sampleGenreLabels],
  );
  const memberCatalogFallbackItems = useMemo(
    () => getHomeMemberCatalogFallbackItems(sampleGenreLabels),
    [sampleGenreLabels],
  );
  const featuredMovies = useMemo(() => pickFeaturedMovies(movies), [movies]);
  const desiredGenreSections = useMemo(
    () =>
      Array.from(new Set(desiredGenreIds))
        .map((genreId) => ({
          id: genreId,
          title: getRecommendationGenreSectionTitle(genreId),
          movies: movies.filter((movie) => matchesRecommendationGenre(genreId, movie.genre)),
        }))
        .filter(
          (section): section is { id: string; title: string; movies: MovieListItem[] } =>
            typeof section.title === 'string' && section.title.length > 0 && section.movies.length > 0,
        ),
    [desiredGenreIds, movies],
  );
  const fallbackMemberSectionTitle = sampleGenreLabels[0] ?? 'おすすめ';
  const memberSectionTitle = memberMovies.length
    ? getPrimaryMovieGenre(memberMovies[0], fallbackMemberSectionTitle)
    : fallbackMemberSectionTitle;
  const showMemberSection = false;
  const publicFallbackTargetMovies: DisplayMovie[] = publicMovies.length
    ? publicMovies
    : MOCK_MOVIES.filter((movie) => getMovieAccessTier(movie) === 'public');
  const memberFallbackTargetMovies: DisplayMovie[] = memberMovies.length
    ? memberMovies
    : MOCK_MOVIES.filter((movie) => getMovieAccessTier(movie) === 'member');
  const genreOptions = useHeaderGenres();
  const genreCards = useMemo(
    () =>
      genreOptions.flatMap((genreName) => {
        const genreMovies = movies.filter((movie) => getMovieGenres(movie).includes(genreName));
        const representativeMovie = genreMovies[0];
        if (!representativeMovie) return [];

        return [{
          name: genreName,
          representativeMovie,
          movieCount: genreMovies.length,
        }];
      }),
    [genreOptions, movies],
  );
  const genrePageCount = Math.max(1, Math.ceil(genreCards.length / genreItemsPerPage));
  const featuredPageCount = Math.max(1, Math.ceil(featuredMovies.length / newArrivalItemsPerPage));
  const newArrivalPageCount = Math.max(1, Math.ceil(newArrivalMovies.length / newArrivalItemsPerPage));
  const showGenreCarouselControls = genreCards.length > 5;

  useEffect(() => {
    setActiveHomeCarouselPages((current) => ({
      ...current,
      featured: Math.min(current.featured ?? 0, featuredPageCount - 1),
      'new-arrivals': Math.min(current['new-arrivals'] ?? 0, newArrivalPageCount - 1),
      purchased: Math.min(
        current.purchased ?? 0,
        Math.max(1, Math.ceil(purchasedMovies.length / newArrivalItemsPerPage)) - 1,
      ),
      watchlist: Math.min(
        current.watchlist ?? 0,
        Math.max(1, Math.ceil(watchlistMovies.length / newArrivalItemsPerPage)) - 1,
      ),
    }));
  }, [
    featuredPageCount,
    newArrivalItemsPerPage,
    newArrivalPageCount,
    purchasedMovies.length,
    watchlistMovies.length,
  ]);

  useEffect(() => {
    setActiveDesiredGenrePages((current) => {
      const next: Record<string, number> = {};

      for (const section of desiredGenreSections) {
        const pageCount = Math.max(1, Math.ceil(section.movies.length / newArrivalItemsPerPage));
        next[section.id] = Math.min(current[section.id] ?? 0, pageCount - 1);
      }

      return next;
    });
  }, [desiredGenreSections, newArrivalItemsPerPage]);

  useEffect(() => {
    setActiveGenrePage((current) => Math.min(current, genrePageCount - 1));
  }, [genrePageCount]);

  const scrollHomeCarouselToPage = (sectionId: HomeCarouselSectionId, pageIndex: number) => {
    const container = homeCarouselRefs.current[sectionId];
    if (!container) return;

    container.scrollTo({
      left: container.clientWidth * pageIndex,
      behavior: 'smooth',
    });
    setActiveHomeCarouselPages((current) => ({
      ...current,
      [sectionId]: pageIndex,
    }));
  };

  const handleHomeCarouselMove = (
    sectionId: HomeCarouselSectionId,
    direction: 'prev' | 'next',
    pageCount: number,
  ) => {
    if (pageCount <= 1) return;

    const currentPage = activeHomeCarouselPages[sectionId] ?? 0;
    const nextPage =
      direction === 'next'
        ? (currentPage + 1) % pageCount
        : (currentPage - 1 + pageCount) % pageCount;

    scrollHomeCarouselToPage(sectionId, nextPage);
  };

  const handleHomeCarouselScroll = (sectionId: HomeCarouselSectionId, pageCount: number) => {
    const container = homeCarouselRefs.current[sectionId];
    if (!container || container.clientWidth === 0) return;

    const nextPage = Math.round(container.scrollLeft / container.clientWidth);
    setActiveHomeCarouselPages((current) => ({
      ...current,
      [sectionId]: Math.max(0, Math.min(nextPage, pageCount - 1)),
    }));
  };

  const scrollDesiredGenreCarouselToPage = (sectionId: string, pageIndex: number) => {
    const container = desiredGenreCarouselRefs.current[sectionId];
    if (!container) return;

    container.scrollTo({
      left: container.clientWidth * pageIndex,
      behavior: 'smooth',
    });
    setActiveDesiredGenrePages((current) => ({
      ...current,
      [sectionId]: pageIndex,
    }));
  };

  const handleDesiredGenreCarouselMove = (
    sectionId: string,
    direction: 'prev' | 'next',
    pageCount: number,
  ) => {
    if (pageCount <= 1) return;

    const currentPage = activeDesiredGenrePages[sectionId] ?? 0;
    const nextPage =
      direction === 'next'
        ? (currentPage + 1) % pageCount
        : (currentPage - 1 + pageCount) % pageCount;

    scrollDesiredGenreCarouselToPage(sectionId, nextPage);
  };

  const handleDesiredGenreCarouselScroll = (sectionId: string, pageCount: number) => {
    const container = desiredGenreCarouselRefs.current[sectionId];
    if (!container || container.clientWidth === 0) return;

    const nextPage = Math.round(container.scrollLeft / container.clientWidth);
    setActiveDesiredGenrePages((current) => ({
      ...current,
      [sectionId]: Math.max(0, Math.min(nextPage, pageCount - 1)),
    }));
  };

  const scrollGenreCarouselToPage = (pageIndex: number) => {
    const container = genreCarouselRef.current;
    if (!container) return;

    container.scrollTo({
      left: container.clientWidth * pageIndex,
      behavior: 'smooth',
    });
    setActiveGenrePage(pageIndex);
  };

  const handleGenreCarouselMove = (direction: 'prev' | 'next') => {
    if (genrePageCount <= 1) return;

    const nextPage =
      direction === 'next'
        ? (activeGenrePage + 1) % genrePageCount
        : (activeGenrePage - 1 + genrePageCount) % genrePageCount;

    scrollGenreCarouselToPage(nextPage);
  };

  const handleGenreCarouselScroll = () => {
    const container = genreCarouselRef.current;
    if (!container || container.clientWidth === 0) return;

    const nextPage = Math.round(container.scrollLeft / container.clientWidth);
    setActiveGenrePage(Math.max(0, Math.min(nextPage, genrePageCount - 1)));
  };


  const renderMovieCard = (movie: DisplayMovie) => {
    const accessTier = getMovieAccessTier(movie);

    return (
      <div
        key={movie.id}
        className="group relative cursor-pointer overflow-hidden rounded-lg transition-transform duration-300 hover:scale-105"
        onClick={() => navigate(`/movies/${movie.id}`, { state: { from: location } })}
      >
        <img
          src={getTestMovieThumbnail(movie, 'card')}
          alt={movie.title}
          className="aspect-[2/3] w-full object-cover"
        />
        <span
          className={`absolute left-2 top-2 rounded-full border px-2 py-1 text-xs font-semibold ${getMovieAccessBadgeClass(accessTier)}`}
        >
          {getPrimaryMovieGenre(movie)}
        </span>
        <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          <div className="absolute bottom-0 left-0 p-4">
            <h3 className="mb-1 font-semibold text-white">{movie.title}</h3>
            {renderReleaseDate(movie.release_date)}
            <p className="mt-2 line-clamp-2 text-sm text-gray-400">{movie.description}</p>
          </div>
        </div>
      </div>
    );
  };

  const renderMovieSection = (title: string, description: string, sectionMovies: DisplayMovie[]) => {
    if (!sectionMovies.length) return null;

    return (
      <section className="mb-12">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-white">{title}</h2>
          <p className="mt-2 text-sm text-gray-400">{description}</p>
        </div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {sectionMovies.map((movie) => renderMovieCard(movie))}
        </div>
      </section>
    );
  };

  const renderGenreCardSection = (title: string, sectionGenres: GenreCard[]) => {
    if (!sectionGenres.length) return null;

    return (
      <section className="mb-12">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-white">{title}</h2>
        </div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {sectionGenres.map((genre) => (
            <Link
              key={genre.name}
              to={`/genres/${encodeURIComponent(genre.name)}`}
              state={{ from: location }}
              aria-label={`ジャンル一覧:${genre.name}`}
              className="group relative block overflow-hidden rounded-lg transition-transform duration-300 hover:scale-105"
            >
              <img
                src={getTestMovieThumbnail(genre.representativeMovie, 'card')}
                alt={genre.name}
                className="aspect-[2/3] w-full object-cover"
              />
              <span className="absolute left-2 top-2 rounded-full border border-white/20 bg-black/25 px-2 py-1 text-xs font-semibold text-white/90 backdrop-blur-sm">
                ジャンル
              </span>
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/55 to-transparent">
                <div className="absolute bottom-0 left-0 p-4">
                  <h3 className="mb-1 text-2xl font-bold text-white">{genre.name}</h3>
                  <p className="text-sm text-gray-300">作品数: {genre.movieCount}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    );
  };
  void renderGenreCardSection;

  const renderGenreCarouselSection = (title: string, sectionGenres: GenreCard[]) => {
    if (!sectionGenres.length) return null;

    return (
      <section className="mb-12">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-white">{title}</h2>
        </div>
        <div className="relative">
          <div
            ref={genreCarouselRef}
            onScroll={handleGenreCarouselScroll}
            className="flex snap-x snap-mandatory gap-6 overflow-x-auto scroll-smooth pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {sectionGenres.map((genre) => (
              <div
                key={genre.name}
                className="w-full shrink-0 snap-start sm:basis-[calc((100%-1.5rem)/2)] md:basis-[calc((100%-3rem)/3)] lg:basis-[calc((100%-4.5rem)/4)] xl:basis-[calc((100%-6rem)/5)]"
              >
                <Link
                  to={`/genres/${encodeURIComponent(genre.name)}`}
                  state={{ from: location }}
                  aria-label={`ジャンル一覧:${genre.name}`}
                  className="group relative block overflow-hidden rounded-lg transition-transform duration-300 hover:scale-105"
                >
                  <img
                    src={getTestMovieThumbnail(genre.representativeMovie, 'card')}
                    alt={genre.name}
                    className="aspect-[2/3] w-full object-cover"
                  />
                  <span className="absolute left-2 top-2 rounded-full border border-white/20 bg-black/25 px-2 py-1 text-xs font-semibold text-white/90 backdrop-blur-sm">
                    ジャンル
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/55 to-transparent">
                    <div className="absolute bottom-0 left-0 p-4">
                      <h3 className="mb-1 text-2xl font-bold text-white">{genre.name}</h3>
                      <p className="text-sm text-gray-300">作品数: {genre.movieCount}</p>
                    </div>
                  </div>
                </Link>
              </div>
            ))}
          </div>
          {showGenreCarouselControls && (
            <>
              <button
                type="button"
                aria-label="前のジャンルへ"
                onClick={() => handleGenreCarouselMove('prev')}
                className="absolute left-3 top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-gray-950/70 text-2xl text-white shadow-lg backdrop-blur transition hover:scale-105 hover:bg-gray-900/85"
              >
                ‹
              </button>
              <button
                type="button"
                aria-label="次のジャンルへ"
                onClick={() => handleGenreCarouselMove('next')}
                className="absolute right-3 top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-gray-950/70 text-2xl text-white shadow-lg backdrop-blur transition hover:scale-105 hover:bg-gray-900/85"
              >
                ›
              </button>
            </>
          )}
        </div>
        {showGenreCarouselControls && (
          <div className="mt-5 flex items-center justify-center gap-2">
            {Array.from({ length: genrePageCount }, (_, index) => {
              const isActive = index === activeGenrePage;
              return (
                <button
                  key={`genre-dot-${index}`}
                  type="button"
                  aria-label={`${index + 1}ページ目へ移動`}
                  onClick={() => scrollGenreCarouselToPage(index)}
                  className={`rounded-full transition ${
                    isActive ? 'h-2.5 w-8 bg-white' : 'h-2.5 w-2.5 bg-white/30 hover:bg-white/55'
                  }`}
                />
              );
            })}
          </div>
        )}
      </section>
    );
  };

  const renderMovieCarouselSection = (
    sectionIdOrTitle: HomeCarouselSectionId | string,
    titleOrDescription: string,
    descriptionOrMovies: string | DisplayMovie[],
    sectionMoviesOrListPath?: DisplayMovie[] | string,
    maybeListPath?: string,
  ) => {
    const isKnownSectionId =
      sectionIdOrTitle === 'featured'
      || sectionIdOrTitle === 'new-arrivals'
      || sectionIdOrTitle === 'purchased'
      || sectionIdOrTitle === 'watchlist';
    const isLegacySignature = !isKnownSectionId && Array.isArray(descriptionOrMovies);
    const sectionId = (isLegacySignature ? 'new-arrivals' : sectionIdOrTitle) as HomeCarouselSectionId;
    const title = (isLegacySignature ? sectionIdOrTitle : titleOrDescription) as string;
    const description = (isLegacySignature ? titleOrDescription : descriptionOrMovies) as string;
    const sectionMovies = (
      isLegacySignature ? descriptionOrMovies : sectionMoviesOrListPath
    ) as DisplayMovie[];
    const listPath = isLegacySignature ? undefined : maybeListPath;

    if (!sectionMovies.length) return null;

    const pageCount = Math.max(1, Math.ceil(sectionMovies.length / newArrivalItemsPerPage));
    const showControls = sectionMovies.length > newArrivalItemsPerPage;
    const activePage = activeHomeCarouselPages[sectionId] ?? 0;

    return (
      <section className="mb-12">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-white">{title}</h2>
            <p className="mt-2 text-sm text-gray-400">{description}</p>
          </div>
          {listPath && (
            <Link
              to={listPath}
              state={{ from: location }}
              aria-label={
                sectionId === 'purchased'
                  ? '\u96c9\uff7c\u8737\uff65\u7e3a\u52b1\u25c6\u870d\u6155\u5224'
                  : sectionId === 'watchlist'
                    ? '\u7e5d\u69ed\u3046\u7e5d\uff6a\u7e67\uff79\u7e5d\u30fb'
                    : undefined
              }
              className="inline-flex items-center gap-1 text-sm font-semibold text-cyan-300 underline decoration-cyan-300/70 underline-offset-4 transition hover:text-cyan-200 hover:decoration-cyan-200"
            >
              <span>{'\u4e00\u89a7\u306f\u3053\u3061\u3089'}</span>
              <span aria-hidden="true">›</span>
            </Link>
          )}
        </div>
        <div className="relative">
          <div
            ref={(node) => {
              homeCarouselRefs.current[sectionId] = node;
            }}
            onScroll={() => handleHomeCarouselScroll(sectionId, pageCount)}
            className="flex snap-x snap-mandatory gap-6 overflow-x-auto scroll-smooth pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {sectionMovies.map((movie) => (
              <div
                key={movie.id}
                className="w-full shrink-0 snap-start sm:basis-[calc((100%-1.5rem)/2)] md:basis-[calc((100%-3rem)/3)]"
              >
                <Link
                  to={`/movies/${movie.id}`}
                  state={{ from: location }}
                  aria-label={`${title}:${movie.title}`}
                  className="block overflow-hidden rounded-2xl border border-gray-800 bg-gray-800/70 shadow-lg transition-transform duration-300 hover:scale-[1.02] hover:border-gray-700"
                >
                  <img
                    src={getTestMovieThumbnail(movie, 'hero')}
                    alt={movie.title}
                    className="h-52 w-full object-cover"
                  />
                  <div className="space-y-3 p-5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${getMovieAccessBadgeClass(getMovieAccessTier(movie))}`}
                      >
                        {getMovieGenreSummary(movie)}
                      </span>
                    </div>
                    <h3 className="text-xl font-bold text-white">{movie.title}</h3>
                    {renderReleaseDate(movie.release_date)}
                    <p className="line-clamp-3 text-sm leading-6 text-gray-300">{movie.description}</p>
                  </div>
                </Link>
              </div>
            ))}
          </div>
          {showControls && (
            <>
              <button
                type="button"
                aria-label={`前の${title}へ`}
                onClick={() => handleHomeCarouselMove(sectionId, 'prev', pageCount)}
                className="absolute left-3 top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-gray-950/70 text-2xl text-white shadow-lg backdrop-blur transition hover:scale-105 hover:bg-gray-900/85"
              >
                ‹
              </button>
              <button
                type="button"
                aria-label={`次の${title}へ`}
                onClick={() => handleHomeCarouselMove(sectionId, 'next', pageCount)}
                className="absolute right-3 top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-gray-950/70 text-2xl text-white shadow-lg backdrop-blur transition hover:scale-105 hover:bg-gray-900/85"
              >
                ›
              </button>
            </>
          )}
        </div>
        {showControls && (
          <div className="mt-5 flex items-center justify-center gap-2">
            {Array.from({ length: pageCount }, (_, index) => {
              const isActive = index === activePage;
              return (
                <button
                  key={`${sectionId}-dot-${index}`}
                  type="button"
                  aria-label={`${title}の${index + 1}ページ目へ移動`}
                  onClick={() => scrollHomeCarouselToPage(sectionId, index)}
                  className={`rounded-full transition ${
                    isActive ? 'h-2.5 w-8 bg-white' : 'h-2.5 w-2.5 bg-white/30 hover:bg-white/55'
                  }`}
                />
              );
            })}
          </div>
        )}
      </section>
    );
  };

  const renderDesiredGenreCarouselSection = (
    sectionId: string,
    title: string,
    description: string,
    sectionMovies: DisplayMovie[],
  ) => {
    if (!sectionMovies.length) return null;

    const pageCount = Math.max(1, Math.ceil(sectionMovies.length / newArrivalItemsPerPage));
    const showControls = sectionMovies.length > newArrivalItemsPerPage;
    const activePage = activeDesiredGenrePages[sectionId] ?? 0;

    return (
      <section className="mb-12">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-white">{title}</h2>
            <p className="mt-2 text-gray-400">{description}</p>
          </div>
          <Link
            to={`/genres/${encodeURIComponent(title)}`}
            state={{ from: location }}
            className="inline-flex items-center gap-1 text-sm font-semibold text-cyan-300 underline decoration-cyan-300/70 underline-offset-4 transition hover:text-cyan-200 hover:decoration-cyan-200"
          >
            <span>一覧はこちら</span>
            <span aria-hidden="true">›</span>
          </Link>
        </div>
        <div className="relative">
          <div
            ref={(node) => {
              desiredGenreCarouselRefs.current[sectionId] = node;
            }}
            onScroll={() => handleDesiredGenreCarouselScroll(sectionId, pageCount)}
            className="flex snap-x snap-mandatory gap-6 overflow-x-auto scroll-smooth pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {sectionMovies.map((movie) => {
              const accessTier = getMovieAccessTier(movie);

              return (
                <div
                  key={movie.id}
                  className="w-full shrink-0 snap-start sm:basis-[calc((100%-1.5rem)/2)] md:basis-[calc((100%-3rem)/3)]"
                >
                  <Link
                    to={`/movies/${movie.id}`}
                    state={{ from: location }}
                    aria-label={`${title}:${movie.title}`}
                    className="block overflow-hidden rounded-2xl border border-gray-800 bg-gray-800/70 shadow-lg transition-transform duration-300 hover:scale-[1.02] hover:border-gray-700"
                  >
                    <img
                      src={getTestMovieThumbnail(movie, 'hero')}
                      alt={movie.title}
                      className="h-52 w-full object-cover"
                    />
                    <div className="space-y-3 p-5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${getMovieAccessBadgeClass(accessTier)}`}
                        >
                          {getMovieGenreSummary(movie)}
                        </span>
                      </div>
                      <h3 className="text-xl font-bold text-white">{movie.title}</h3>
                      {renderReleaseDate(movie.release_date)}
                      <p className="line-clamp-3 text-sm leading-6 text-gray-300">{movie.description}</p>
                    </div>
                  </Link>
                </div>
              );
            })}
          </div>
          {showControls && (
            <>
              <button
                type="button"
                aria-label={`前の${title}へ`}
                onClick={() => handleDesiredGenreCarouselMove(sectionId, 'prev', pageCount)}
                className="absolute left-3 top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-gray-950/70 text-2xl text-white shadow-lg backdrop-blur transition hover:scale-105 hover:bg-gray-900/85"
              >
                ‹
              </button>
              <button
                type="button"
                aria-label={`次の${title}へ`}
                onClick={() => handleDesiredGenreCarouselMove(sectionId, 'next', pageCount)}
                className="absolute right-3 top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-gray-950/70 text-2xl text-white shadow-lg backdrop-blur transition hover:scale-105 hover:bg-gray-900/85"
              >
                ›
              </button>
            </>
          )}
        </div>
        {showControls && (
          <div className="mt-5 flex items-center justify-center gap-2">
            {Array.from({ length: pageCount }, (_, index) => {
              const isActive = index === activePage;
              return (
                <button
                  key={`${sectionId}-dot-${index}`}
                  type="button"
                  aria-label={`${title}の${index + 1}ページ目へ移動`}
                  onClick={() => scrollDesiredGenreCarouselToPage(sectionId, index)}
                  className={`rounded-full transition ${
                    isActive ? 'h-2.5 w-8 bg-white' : 'h-2.5 w-2.5 bg-white/30 hover:bg-white/55'
                  }`}
                />
              );
            })}
          </div>
        )}
      </section>
    );
  };

  const renderHomeTestSection = (
    title: string,
    description: string,
    items: ReturnType<typeof getHomeMemberCatalogFallbackItems>,
    targetMovies: DisplayMovie[],
  ) => {
    if (!items.length) return null;

    return (
      <section className="mb-12">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-white">{title}</h2>
            <p className="mt-2 text-sm text-gray-400">{description}</p>
          </div>
          <span className="rounded-full border border-fuchsia-400/40 bg-fuchsia-500/10 px-3 py-1 text-sm text-fuchsia-200">
            TEST LIST
          </span>
        </div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3">
          {items.map((item, index) => {
            const targetMovie =
              getMovieByLoopIndex(targetMovies, index) ??
              getMovieByLoopIndex(movies, index) ??
              getMovieByLoopIndex(MOCK_MOVIES, index);
            const cardContent = (
              <>
                <img
                  src={item.image}
                  alt={item.title}
                  className="aspect-[16/9] w-full object-cover"
                />
                <div className="space-y-2 p-5">
                  <div className="flex justify-end">
                    <span className="rounded-full border border-gray-600 px-2.5 py-1 text-xs font-semibold text-gray-200">
                      {item.subtitle}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-white">{item.title}</h3>
                  {renderReleaseDate(item.detail.releaseDate)}
                  <p className="text-sm leading-6 text-gray-300">{item.description}</p>
                </div>
              </>
            );

            if (targetMovie) {
              return (
                <Link
                  key={item.id}
                  to={`/movies/${targetMovie.id}?testDetailId=${encodeURIComponent(item.id)}`}
                  state={{ from: location }}
                  aria-label={`動画:${item.title}`}
                  className="block overflow-hidden rounded-2xl border border-gray-800 bg-gray-800/70 shadow-lg transition-transform duration-300 hover:scale-[1.02] hover:border-gray-700"
                >
                  {cardContent}
                </Link>
              );
            }

            return (
              <article
                key={item.id}
                className="overflow-hidden rounded-2xl border border-gray-800 bg-gray-800/70 shadow-lg"
              >
                {cardContent}
              </article>
            );
          })}
        </div>
      </section>
    );
  };

/*
  const renderRecommendationSection = () => {
    return renderMovieCarouselSection(
      'featured',
      'おすすめ動画',
      'ホームに掲載中のおすすめ作品を表示しています。',
      featuredMovies,
    );
    if (!recommendationMovies.length) return null;

    return (
      <section className="mb-12">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-white">おすすめ動画</h2>
            <p className="mt-2 text-gray-400">
              作成済みのジャンルをもとに、いま視聴できる作品からおすすめを表示しています。
            </p>
          </div>
          <span className="rounded-full border border-cyan-400/40 bg-cyan-400/10 px-3 py-1 text-sm text-cyan-200">
            RECOMMEND
          </span>
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.5fr_1fr_1fr]">
          {recommendationMovies.map((movie, index) => {
            const accessTier = getMovieAccessTier(movie);

            return (
              <Link
                key={movie.id}
                to={`/movies/${movie.id}`}
                state={{ from: location }}
                aria-label={`おすすめ動画:${movie.title}`}
                className={`overflow-hidden rounded-2xl border border-gray-800 bg-gray-800/70 shadow-lg transition-transform duration-300 hover:scale-[1.02] hover:border-gray-700 ${index === 0 ? 'lg:row-span-2' : ''
                  }`}
              >
                <img
                  src={getTestMovieThumbnail(movie, index === 0 ? 'hero' : 'card')}
                  alt={movie.title}
                  className={`w-full object-cover ${index === 0 ? 'h-[320px] lg:h-full' : 'h-52'}`}
                />
                <div className="space-y-3 p-5">
                  <div className="flex flex-wrap items-center gap-3">
                    <span
                      className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${getMovieAccessBadgeClass(accessTier)}`}
                    >
                      {getMovieGenreSummary(movie)}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-white">{movie.title}</h3>
                  {renderReleaseDate(movie.release_date)}
                  <p className="line-clamp-3 text-sm leading-6 text-gray-300">{movie.description}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    );
  };
*/

  const renderRecommendationSection = () =>
    renderMovieCarouselSection(
      'featured',
      '\u304a\u3059\u3059\u3081\u52d5\u753b',
      '\u30db\u30fc\u30e0\u306b\u63b2\u8f09\u4e2d\u306e\u304a\u3059\u3059\u3081\u4f5c\u54c1\u3092\u8868\u793a\u3057\u3066\u3044\u307e\u3059\u3002',
      featuredMovies,
    );

  const renderRecommendationStyleSection = (
    title: string,
    description: string,
    sectionMovies: DisplayMovie[],
  ) => {
    if (!sectionMovies.length) return null;

    return (
      <section className="mb-12">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-white">{title}</h2>
          <p className="mt-2 text-gray-400">{description}</p>
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {sectionMovies.map((movie) => {
            const accessTier = getMovieAccessTier(movie);

            return (
              <Link
                key={movie.id}
                to={`/movies/${movie.id}`}
                state={{ from: location }}
                aria-label={`${title}:${movie.title}`}
                className="overflow-hidden rounded-2xl border border-gray-800 bg-gray-800/70 shadow-lg transition-transform duration-300 hover:scale-[1.02] hover:border-gray-700"
              >
                <img
                  src={getTestMovieThumbnail(movie, 'card')}
                  alt={movie.title}
                  className="h-52 w-full object-cover"
                />
                <div className="space-y-3 p-5">
                  <div className="flex flex-wrap items-center gap-3">
                    <span
                      className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${getMovieAccessBadgeClass(accessTier)}`}
                    >
                      {getMovieGenreSummary(movie)}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-white">{movie.title}</h3>
                  {renderReleaseDate(movie.release_date)}
                  <p className="line-clamp-3 text-sm leading-6 text-gray-300">{movie.description}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    );
  };

  const publicSectionDescription =
    accessState === 'guest'
      ? '未ログインでも視聴できる配信作品を一覧で表示しています。'
      : accessState === 'registered'
        ? 'ログイン後でもそのまま視聴できる配信作品をまとめて表示しています。'
        : 'メンバーシップ登録中でも視聴できる公開作品を一覧で表示しています。';

  const memberSectionDescription =
    accessState === 'member'
      ? 'メンバーシップ登録中のため、そのまま視聴できる動画を表示しています。'
      : `月額 ${MEMBERSHIP_MONTHLY_PRICE.toLocaleString()} 円のメンバーシップ登録後に視聴できる動画です。`;
  const publicSectionTitle = accessState === 'guest' ? '紹介動画' : '配信内容一覧';
  const publicFallbackDescription = accessState === 'guest'
    ? '紹介動画の元データが未登録のため、暫定のテスト一覧を表示しています。'
    : '配信内容一覧の元データが未登録のため、暫定のテスト一覧を表示しています。';

  return (
    <div className="min-h-screen bg-gray-900">
      <Header
        isAuthenticated={isAuthenticated}
        onLogin={() => navigate('/login')}
        onLogout={logoutAll}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onSearchSubmit={handleSearchSubmit}
        genreOptions={genreOptions}
      />

      <main className="container mx-auto px-4 pb-12 pt-24">
        {heroMovie && (
          <section className="mb-12">
            <div className="relative h-[60vh] overflow-hidden rounded-xl">
              <img
                src={getTestMovieThumbnail(heroMovie, 'hero')}
                alt={heroMovie.title}
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/50 to-transparent">
                <div className="absolute bottom-0 left-0 p-8">
                  <div
                    className={`inline-flex rounded-full border px-3 py-1 text-sm ${getMovieAccessBadgeClass(getMovieAccessTier(heroMovie))}`}
                  >
                    {getMovieGenreSummary(heroMovie)}
                  </div>
                  <h2 className="mb-4 mt-4 text-4xl font-bold text-white">{heroMovie.title}</h2>
                  <button
                    onClick={() => navigate(`/movies/${heroMovie.id}`, { state: { from: location } })}
                    className="rounded-lg bg-white px-8 py-3 font-semibold text-gray-900 transition hover:bg-gray-100"
                  >
                    詳細を見る
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}

        {renderRecommendationSection()}
        {desiredGenreSections.map((section) => (
          <div key={section.id}>
            {renderDesiredGenreCarouselSection(
              section.id,
              section.title,
              `${section.title}に設定した作品を表示しています。`,
              section.movies,
            )}
          </div>
        ))}
        {renderMovieCarouselSection('新着一覧', '新着の作品を紹介します。', newArrivalMovies)}
        {isAuthenticated && renderMovieCarouselSection(
          'purchased',
          '\u8cfc\u5165\u3057\u305f\u52d5\u753b',
          '\u8cfc\u5165\u6e08\u307f\u306e\u52d5\u753b\u3092\u8868\u793a\u3057\u307e\u3059\u3002',
          purchasedMovies,
          '/library',
        )}
        {isAuthenticated && renderMovieCarouselSection(
          'watchlist',
          '\u30de\u30a4\u30ea\u30b9\u30c8',
          '\u30de\u30a4\u30ea\u30b9\u30c8\u306b\u767b\u9332\u3057\u3066\u3044\u308b\u52d5\u753b\u3092\u8868\u793a\u3057\u307e\u3059\u3002',
          watchlistMovies,
          '/watchlist',
        )}
        {renderGenreCarouselSection('ジャンル一覧', genreCards)}

        {false && isAuthenticated && renderMovieCarouselSection(
          'purchased',
          '購入した動画',
          '購入済みの動画を表示します。',
          purchasedMovies,
          '/library',
        )}
        {false && isAuthenticated && renderMovieCarouselSection(
          'watchlist',
          'マイリスト',
          'マイリストに登録している動画を表示します。',
          watchlistMovies,
          '/watchlist',
        )}

        {publicMovies.length > 0
          ? renderMovieSection(publicSectionTitle, publicSectionDescription, publicMovies)
          : renderHomeTestSection(
            publicSectionTitle,
            publicFallbackDescription,
            publicCatalogFallbackItems,
            publicFallbackTargetMovies,
          )}

        {showMemberSection && accessState !== 'guest' &&
          (memberMovies.length > 0
            ? renderMovieSection(memberSectionTitle, memberSectionDescription, memberMovies)
            : renderHomeTestSection(
              memberSectionTitle,
              'メンバー向け一覧の元データが未登録のため、暫定のテスト一覧を表示しています。',
              memberCatalogFallbackItems,
              memberFallbackTargetMovies,
            ))}

        {topRated.length > 0 &&
          renderRecommendationStyleSection(
            '高評価動画',
            'レビュー評価の高い作品を表示しています。',
            topRated,
          )}

        {publicMovies.length === 0
          && memberMovies.length === 0
          && publicFallbackTargetMovies.length === 0
          && memberFallbackTargetMovies.length === 0 && (
            <div className="rounded-lg bg-gray-800 p-8 text-center text-gray-300">
              表示できる動画がありません。
            </div>
          )}
      </main>

      <footer className="border-t border-gray-800 bg-gray-900">
        <div className="container mx-auto px-4 py-8">
          <p className="text-center text-gray-400">Copyright WiiBER All Rights Reserved.</p>
        </div>
      </footer>
    </div>
  );
}
