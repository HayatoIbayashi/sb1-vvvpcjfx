import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import MovieDetailPage from './MovieDetailPage';

const { mockApi, mockAuthStatus } = vi.hoisted(() => ({
  mockApi: {
    getMovie: vi.fn(),
    getWatchlist: vi.fn(),
    addToWatchlist: vi.fn(),
    removeFromWatchlist: vi.fn(),
    getSubscriptionCurrent: vi.fn(),
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
  default: () => <div>comments</div>,
}));

function WatchRouteProbe() {
  const location = useLocation();
  return <div>{`${location.pathname}${location.search}`}</div>;
}

describe('MovieDetailPage watch link', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_USE_MOCK_MOVIES', 'false');

    mockApi.getMovie.mockReset();
    mockApi.getWatchlist.mockReset();
    mockApi.addToWatchlist.mockReset();
    mockApi.removeFromWatchlist.mockReset();
    mockApi.getSubscriptionCurrent.mockReset();

    mockApi.getMovie.mockResolvedValue({
      id: 'movie-1',
      title: '動画A',
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
      is_published: true,
      publish_at: '2026-04-01T00:00:00.000Z',
      unpublish_at: null,
      view_window_days: 2,
      created_at: '2026-04-01T00:00:00.000Z',
      updated_at: '2026-04-01T00:00:00.000Z',
    });
    mockApi.getWatchlist.mockResolvedValue({ items: [] });
    mockApi.getSubscriptionCurrent.mockResolvedValue({
      active: true,
      subscription: {
        id: 'subscription-1',
        user_id: 'user-1',
        plan_id: 'plan-membership',
        status: 'active',
        started_at: '2026-04-01T00:00:00.000Z',
        renews_at: '2026-05-01T00:00:00.000Z',
        canceled_at: null,
        ended_at: null,
        created_at: '2026-04-01T00:00:00.000Z',
        updated_at: '2026-04-01T00:00:00.000Z',
        plan_name: 'メンバーシップ',
        price_monthly: 1000,
        plan_is_active: true,
      },
    });
  });

  it('opens the watch page with autoplay when the watch button is clicked', async () => {
    render(
      <MemoryRouter initialEntries={['/movies/movie-1']}>
        <Routes>
          <Route path="/movies/:id" element={<MovieDetailPage />} />
          <Route path="/watch/:id" element={<WatchRouteProbe />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(mockApi.getMovie).toHaveBeenCalledWith('movie-1');
    });

    fireEvent.click(await screen.findByRole('button', { name: '今すぐ視聴する' }));

    expect(await screen.findByText('/watch/movie-1?autoplay=1')).toBeInTheDocument();
  });

  it('opens the watch page from a local mock movie without calling the movie api', async () => {
    render(
      <MemoryRouter initialEntries={['/movies/2?testDetailId=member-test-1']}>
        <Routes>
          <Route path="/movies/:id" element={<MovieDetailPage />} />
          <Route path="/watch/:id" element={<WatchRouteProbe />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.click(await screen.findByRole('button', { name: '今すぐ視聴する' }));

    expect(mockApi.getMovie).not.toHaveBeenCalled();
    expect(await screen.findByText('/watch/2?autoplay=1')).toBeInTheDocument();
  });
});
