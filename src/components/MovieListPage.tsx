import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import type { Database } from '../lib/types';
import { MOCK_MOVIES } from '../mockData';
import useApiClient from '../lib/useApiClient';
import type { HomePageData, MovieListItem } from '../lib/apiClient';
import { useAuthStatus } from '../lib/authBridge';
import { getTestMovieThumbnail } from '../lib/testMovieThumbnails';
import {
  getHomeMemberCatalogFallbackItems,
  getHomeMovieListTestSections,
  getHomePublicCatalogFallbackItems,
} from './homeDisplaySamples';
import { getMovieGenreSummary, getPrimaryMovieGenre } from '../lib/movieGenres';
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

const LS_RECOMMENDATION_PREFERENCES = 'account_recommendation_preferences_v1';

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

function pickRecommendationMovies<T extends DisplayMovie>(movies: T[], limit = 3) {
  const selected: T[] = [];
  const usedGenres = new Set<string>();

  for (const movie of movies) {
    const primaryGenre = (movie.genre ?? []).find((genre) => typeof genre === 'string' && genre.trim());
    if (!primaryGenre || usedGenres.has(primaryGenre)) continue;

    selected.push(movie);
    usedGenres.add(primaryGenre);

    if (selected.length >= limit) {
      return selected;
    }
  }

  for (const movie of movies) {
    if (selected.some((item) => item.id === movie.id)) continue;
    selected.push(movie);
    if (selected.length >= limit) break;
  }

  return selected;
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
  const api = useApiClient();
  const useMockMovies = import.meta.env.VITE_USE_MOCK_MOVIES === 'true';

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
        }
        applyStoredRecommendations();
        return;
      }

      applyStoredRecommendations();

      try {
        const result = await api.getHomePageData();
        applyHomeData(result);
      } catch (error) {
        console.error('Error fetching home page data:', error);
        if (!cancelled) {
          setMovies(MOCK_MOVIES.map(toMovieListItem));
          setAccessState(isAuthenticated ? 'registered' : 'guest');
        }
      }
    };

    void loadHomeData();
    return () => {
      cancelled = true;
    };
  }, [api, isAuthenticated, useMockMovies]);

  const { publicMovies, memberMovies } = partitionMoviesByAccess(movies);
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
  const memberTestTargetMovies = memberMovies.length
    ? memberMovies
    : MOCK_MOVIES.filter((movie) => getMovieAccessTier(movie) === 'member');
  const homeMovieListTestSections = useMemo(
    () => getHomeMovieListTestSections(sampleGenreLabels),
    [sampleGenreLabels],
  );
  const publicCatalogFallbackItems = useMemo(
    () => getHomePublicCatalogFallbackItems(sampleGenreLabels),
    [sampleGenreLabels],
  );
  const memberCatalogFallbackItems = useMemo(
    () => getHomeMemberCatalogFallbackItems(sampleGenreLabels),
    [sampleGenreLabels],
  );
  const recommendationSourceMovies = availableNowMovies.length
    ? availableNowMovies
      : publicMovies.length
      ? publicMovies
      : movies;
  const recommendationMovies = pickRecommendationMovies(recommendationSourceMovies);
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
  const publicFallbackTargetMovies: DisplayMovie[] = publicMovies.length
    ? publicMovies
    : MOCK_MOVIES.filter((movie) => getMovieAccessTier(movie) === 'public');
  const memberFallbackTargetMovies: DisplayMovie[] = memberMovies.length
    ? memberMovies
    : memberTestTargetMovies;
  const genreOptions = useHeaderGenres();

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

  const renderHomeTestSection = (
    title: string,
    description: string,
    items: ReturnType<typeof getHomeMovieListTestSections>[number]['items'],
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
              getMovieByLoopIndex(memberMovies, index) ??
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

  const renderRecommendationSection = () => {
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
                className={`overflow-hidden rounded-2xl border border-gray-800 bg-gray-800/70 shadow-lg transition-transform duration-300 hover:scale-[1.02] hover:border-gray-700 ${
                  index === 0 ? 'lg:row-span-2' : ''
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
            {renderRecommendationStyleSection(
            section.title,
            `${section.title}に設定した作品を表示しています。`,
            section.movies,
            )}
          </div>
        ))}

        {accessState !== 'guest' &&
          homeMovieListTestSections.map((section) => (
            <div key={section.id}>
              {renderHomeTestSection(
                section.title,
                section.description,
                section.items,
                memberTestTargetMovies,
              )}
            </div>
          ))}

        {publicMovies.length > 0
          ? renderMovieSection(publicSectionTitle, publicSectionDescription, publicMovies)
          : renderHomeTestSection(
              publicSectionTitle,
              publicFallbackDescription,
              publicCatalogFallbackItems,
              publicFallbackTargetMovies,
            )}

        {accessState !== 'guest' &&
          (memberMovies.length > 0
            ? renderMovieSection(memberSectionTitle, memberSectionDescription, memberMovies)
            : renderHomeTestSection(
                memberSectionTitle,
                'メンバー向け一覧の元データが未登録のため、暫定のテスト一覧を表示しています。',
                memberCatalogFallbackItems,
                memberFallbackTargetMovies,
              ))}

        {topRated.length > 0 &&
          renderMovieSection('高評価動画', 'レビュー評価の高い作品を表示しています。', topRated)}

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
