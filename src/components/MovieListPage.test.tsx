import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import MovieListPage from './MovieListPage';

const baseMovies = [
  {
    id: 'movie-public',
    title: 'Public Movie',
    description: 'public description',
    thumbnail: null,
    thumbnail_top: null,
    thumbnail_detail: null,
    release_date: '2026-04-01',
    duration: '20:00',
    genre: ['Action'],
    cast: [],
    director: null,
    release_year: null,
    created_at: '2026-04-01T00:00:00.000Z',
    updated_at: '2026-04-01T00:00:00.000Z',
    price: 0,
    rental_price: 0,
    average_rating: 4.8,
    review_count: 12,
  },
  {
    id: 'movie-member',
    title: 'Member Movie',
    description: 'member description',
    thumbnail: null,
    thumbnail_top: null,
    thumbnail_detail: null,
    release_date: '2026-04-02',
    duration: '25:00',
    genre: ['Documentary'],
    cast: [],
    director: null,
    release_year: null,
    created_at: '2026-04-02T00:00:00.000Z',
    updated_at: '2026-04-02T00:00:00.000Z',
    price: 1,
    rental_price: 1,
    average_rating: 4.2,
    review_count: 8,
  },
];

const preferenceSectionMovies = [
  {
    ...baseMovies[0],
    id: 'movie-gambling',
    title: 'Gambling Movie',
    genre: ['ギャンブル'],
  },
  {
    ...baseMovies[0],
    id: 'movie-horror',
    title: 'Horror Movie',
    genre: ['ホラー描写'],
  },
];

const { mockApi, mockAuthStatus } = vi.hoisted(() => ({
  mockApi: {
    getHomePageData: vi.fn(),
    getReviews: vi.fn(),
  },
  mockAuthStatus: {
    isAuthenticated: false,
    logoutAll: vi.fn(),
  },
}));

vi.mock('../lib/useApiClient', () => ({
  default: () => mockApi,
}));

vi.mock('../lib/authBridge', () => ({
  useAuthStatus: () => mockAuthStatus,
}));

describe('MovieListPage', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_USE_MOCK_MOVIES', 'false');
    vi.stubEnv('VITE_USE_MOCK_REVIEWS', 'false');

    mockApi.getHomePageData.mockReset();
    mockApi.getReviews.mockReset();
    mockAuthStatus.isAuthenticated = false;

    mockApi.getHomePageData.mockResolvedValue({
      movies: [...baseMovies],
      accessState: 'guest',
      desiredGenreIds: [],
    });
    mockApi.getReviews.mockResolvedValue({ items: [] });
  });

  it('requests home page data once for guests', async () => {
    render(
      <MemoryRouter>
        <MovieListPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(mockApi.getHomePageData).toHaveBeenCalledTimes(1);
    });

    expect(mockApi.getReviews).not.toHaveBeenCalled();
    expect(screen.getByText('Public Movie')).toBeInTheDocument();
  });

  it('shows logged-in sections from the home page payload', async () => {
    mockAuthStatus.isAuthenticated = true;
    mockApi.getHomePageData.mockResolvedValue({
      movies: [...baseMovies],
      accessState: 'registered',
      desiredGenreIds: ['horror', 'gambling', 'sexual-content'],
    });

    render(
      <MemoryRouter>
        <MovieListPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(mockApi.getHomePageData).toHaveBeenCalledTimes(1);
    });

    expect(screen.getByText('Documentary')).toBeInTheDocument();
    expect(screen.getByText('Member Movie')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'マイライブラリ' })).toHaveAttribute('href', '/library');
  });

  it('adds a desired genre section for configured preferences', async () => {
    mockAuthStatus.isAuthenticated = true;
    mockApi.getHomePageData.mockResolvedValue({
      movies: [...baseMovies, preferenceSectionMovies[0]],
      accessState: 'registered',
      desiredGenreIds: ['gambling'],
    });

    render(
      <MemoryRouter>
        <MovieListPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(mockApi.getHomePageData).toHaveBeenCalledTimes(1);
    });

    const gamblingSection = screen.getByRole('heading', { name: 'ギャンブル' }).closest('section');
    expect(gamblingSection).not.toBeNull();
    expect(within(gamblingSection as HTMLElement).getByText('Gambling Movie')).toBeInTheDocument();
  });

  it('renders multiple desired genre sections and skips empty ones', async () => {
    mockAuthStatus.isAuthenticated = true;
    mockApi.getHomePageData.mockResolvedValue({
      movies: [...baseMovies, ...preferenceSectionMovies],
      accessState: 'registered',
      desiredGenreIds: ['gambling', 'horror', 'disturbing-themes'],
    });

    render(
      <MemoryRouter>
        <MovieListPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(mockApi.getHomePageData).toHaveBeenCalledTimes(1);
    });

    const gamblingSection = screen.getByRole('heading', { name: 'ギャンブル' }).closest('section');
    const horrorSection = screen.getByRole('heading', { name: 'ホラー描写' }).closest('section');

    expect(gamblingSection).not.toBeNull();
    expect(horrorSection).not.toBeNull();
    expect(within(gamblingSection as HTMLElement).getByText('Gambling Movie')).toBeInTheDocument();
    expect(within(horrorSection as HTMLElement).getByText('Horror Movie')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: '不穏なテーマ' })).not.toBeInTheDocument();
  });

  it('opens the movie detail page when a recommendation card is clicked', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<MovieListPage />} />
          <Route path="/movies/:id" element={<div>detail page</div>} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(mockApi.getHomePageData).toHaveBeenCalledTimes(1);
    });

    fireEvent.click(screen.getByRole('link', { name: /Public Movie/ }));
    expect(await screen.findByText('detail page')).toBeInTheDocument();
  });

  it('shows fallback cards instead of the empty message when the movie list is empty', async () => {
    mockApi.getHomePageData.mockResolvedValue({
      movies: [],
      accessState: 'guest',
      desiredGenreIds: [],
    });

    render(
      <MemoryRouter>
        <MovieListPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(mockApi.getHomePageData).toHaveBeenCalledTimes(1);
    });

    expect(screen.getByText(/01/)).toBeInTheDocument();
  });

  it('builds the top rated section from aggregate ratings without fetching reviews', async () => {
    mockApi.getHomePageData.mockResolvedValue({
      movies: [
        {
          ...baseMovies[0],
          id: 'movie-top-2',
          title: 'Top 4.4',
          average_rating: 4.4,
          review_count: 15,
        },
        {
          ...baseMovies[0],
          id: 'movie-top-1',
          title: 'Top 4.9',
          average_rating: 4.9,
          review_count: 9,
        },
        {
          ...baseMovies[0],
          id: 'movie-unrated',
          title: 'Unrated',
          average_rating: null,
          review_count: 0,
        },
      ],
      accessState: 'guest',
      desiredGenreIds: [],
    });

    render(
      <MemoryRouter>
        <MovieListPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(mockApi.getHomePageData).toHaveBeenCalledTimes(1);
    });

    expect(mockApi.getReviews).not.toHaveBeenCalled();
    expect(screen.queryByText('Unrated')).not.toBeInTheDocument();

    const topRatedSection = screen.getByText('Top 4.9').closest('section');
    expect(topRatedSection?.textContent?.indexOf('Top 4.9')).toBeLessThan(
      topRatedSection?.textContent?.indexOf('Top 4.4') ?? Number.POSITIVE_INFINITY,
    );
  });
});
