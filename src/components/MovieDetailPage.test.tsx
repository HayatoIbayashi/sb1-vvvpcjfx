import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import MovieDetailPage from './MovieDetailPage';

const { mockApi, mockAuthStatus } = vi.hoisted(() => ({
  mockApi: {
    getMovie: vi.fn(),
    getWatchlist: vi.fn(),
    addToWatchlist: vi.fn(),
    removeFromWatchlist: vi.fn(),
    getSubscriptionCurrent: vi.fn(),
    getPurchases: vi.fn(),
  },
  mockAuthStatus: {
    isAuthenticated: true,
    loginHosted: vi.fn(),
    logoutAll: vi.fn(),
  },
}));

vi.mock('../lib/useApiClient', () => ({
  default: () => mockApi,
}));

vi.mock('../lib/authBridge', () => ({
  useAuthStatus: () => mockAuthStatus,
}));

vi.mock('./common/Header', () => ({
  Header: () => <div>header</div>,
}));

vi.mock('./ReviewSection', () => ({
  default: () => <div>reviews</div>,
}));

describe('MovieDetailPage', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_USE_MOCK_MOVIES', 'false');

    mockApi.getMovie.mockReset();
    mockApi.getWatchlist.mockReset();
    mockApi.addToWatchlist.mockReset();
    mockApi.removeFromWatchlist.mockReset();
    mockApi.getSubscriptionCurrent.mockReset();
    mockApi.getPurchases.mockReset();

    mockApi.getMovie.mockResolvedValue({
      id: 'movie-1',
      title: '作品A',
      description: '説明',
      thumbnail: 'https://example.com/thumb.jpg',
      thumbnail_top: null,
      thumbnail_detail: null,
      release_date: '2026-04-01',
      duration: '20分',
      genre: ['ホラー描写', '過度な暴力表現'],
      cast: [],
      director: null,
      release_year: null,
      price: 1,
      rental_price: 1,
      access_mode: 'purchase_only',
      buy_price: 1000,
      currency: 'JPY',
      stripe_price_id_one_time: null,
      is_published: true,
      publish_at: '2026-04-01T00:00:00.000Z',
      unpublish_at: null,
      view_window_days: 2,
      created_at: '2026-04-01T00:00:00.000Z',
      updated_at: '2026-04-01T00:00:00.000Z',
    });
    mockApi.getSubscriptionCurrent.mockResolvedValue({
      active: false,
      subscription: null,
    });
    mockApi.getPurchases.mockResolvedValue({ items: [] });
  });

  it('adds the movie to watchlist', async () => {
    mockApi.getWatchlist.mockResolvedValue({ items: [] });
    mockApi.addToWatchlist.mockResolvedValue({ ok: true, added: true });

    render(
      <MemoryRouter initialEntries={['/movies/movie-1']}>
        <Routes>
          <Route path="/movies/:id" element={<MovieDetailPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText('作品A')).toBeInTheDocument();
    expect(screen.getByText('ホラー描写 / 過度な暴力表現')).toBeInTheDocument();

    fireEvent.click(await screen.findByRole('button', { name: 'マイリストに追加' }));

    await waitFor(() => {
      expect(mockApi.addToWatchlist).toHaveBeenCalledWith('movie-1');
    });
    expect(await screen.findByRole('button', { name: 'マイリストから外す' })).toBeInTheDocument();
  });

  it('shows the watch button for purchased movies', async () => {
    mockApi.getWatchlist.mockResolvedValue({ items: [] });
    mockApi.getPurchases.mockResolvedValue({ items: [{ id: 'purchase-1', movie_id: 'movie-1', status: 'completed' }] });

    render(
      <MemoryRouter initialEntries={['/movies/movie-1']}>
        <Routes>
          <Route path="/movies/:id" element={<MovieDetailPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByRole('button', { name: '今すぐ視聴する' })).toBeInTheDocument();
  });

  it('shows the purchase guidance for logged-in users on unpurchased videos', async () => {
    mockApi.getWatchlist.mockResolvedValue({ items: [] });
    mockApi.getMovie.mockResolvedValue({
      id: 'movie-1',
      title: '作品A',
      description: '説明',
      thumbnail: 'https://example.com/thumb.jpg',
      thumbnail_top: null,
      thumbnail_detail: null,
      release_date: '2026-04-01',
      duration: '20分',
      genre: [],
      cast: [],
      director: null,
      release_year: null,
      price: 1,
      rental_price: 1,
      access_mode: 'purchase_only',
      buy_price: 1000,
      currency: 'JPY',
      stripe_price_id_one_time: null,
      is_published: true,
      publish_at: '2026-04-01T00:00:00.000Z',
      unpublish_at: null,
      view_window_days: 2,
      created_at: '2026-04-01T00:00:00.000Z',
      updated_at: '2026-04-01T00:00:00.000Z',
    });

    render(
      <MemoryRouter initialEntries={['/movies/movie-1']}>
        <Routes>
          <Route path="/movies/:id" element={<MovieDetailPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText('この動画は購入が必要です')).toBeInTheDocument();
  });

  it('does not show the watch button for unpurchased purchase-only movies', async () => {
    mockApi.getWatchlist.mockResolvedValue({ items: [] });

    render(
      <MemoryRouter initialEntries={['/movies/movie-1']}>
        <Routes>
          <Route path="/movies/:id" element={<MovieDetailPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText('この動画は購入が必要です')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '今すぐ視聴する' })).not.toBeInTheDocument();
  });

  it('shows the genre on the detail header and hides the membership checking copy while loading', async () => {
    mockApi.getWatchlist.mockResolvedValue({ items: [] });
    mockApi.getMovie.mockResolvedValue({
      id: 'movie-genre-test',
      title: 'Genre Test Title',
      description: 'Genre Test Description',
      thumbnail: 'https://example.com/thumb.jpg',
      thumbnail_top: null,
      thumbnail_detail: null,
      release_date: '2026-04-01',
      duration: '20分',
      genre: ['ホラー描写'],
      cast: [],
      director: null,
      release_year: null,
      price: 1,
      rental_price: 1,
      is_published: true,
      publish_at: '2026-04-01T00:00:00.000Z',
      unpublish_at: null,
      view_window_days: 2,
      created_at: '2026-04-01T00:00:00.000Z',
      updated_at: '2026-04-01T00:00:00.000Z',
    });
    mockApi.getSubscriptionCurrent.mockImplementation(() => new Promise(() => {}));

    render(
      <MemoryRouter initialEntries={['/movies/movie-genre-test']}>
        <Routes>
          <Route path="/movies/:id" element={<MovieDetailPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: 'Genre Test Title' })).toBeInTheDocument();
    expect(screen.getAllByText('ホラー描写').length).toBeGreaterThan(0);
    expect(screen.queryByText('視聴権限を確認しています...')).not.toBeInTheDocument();
    expect(screen.queryByText('視聴権限を確認しています。')).not.toBeInTheDocument();
  });
});
