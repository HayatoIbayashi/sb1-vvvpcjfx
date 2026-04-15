import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import MoviePlayerPage from './MoviePlayerPage';

const { mockApi, mockAuthStatus } = vi.hoisted(() => ({
  mockApi: {
    getMovie: vi.fn(),
    addWatchHistory: vi.fn(),
    getSubscriptionCurrent: vi.fn(),
  },
  mockAuthStatus: {
    isAuthenticated: true,
  },
}));

vi.mock('../lib/useApiClient', () => ({
  default: () => mockApi,
}));

vi.mock('../lib/authBridge', () => ({
  useAuthStatus: () => mockAuthStatus,
}));

vi.mock('../lib/storageUtils', () => ({
  linkToStorageFile: vi.fn().mockResolvedValue('https://example.com/movie.mp4'),
}));

vi.mock('react-player', () => ({
  default: () => <div>player</div>,
}));

describe('MoviePlayerPage', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_USE_MOCK_MOVIES', 'false');
    vi.stubEnv('VITE_USE_MOCK_WATCH_HISTORY', 'false');
    mockApi.getMovie.mockReset();
    mockApi.addWatchHistory.mockReset();
    mockApi.getSubscriptionCurrent.mockReset();
    mockApi.getMovie.mockResolvedValue({
      id: 'movie-1',
      title: '作品A',
      description: '説明',
      thumbnail: null,
      thumbnail_top: null,
      thumbnail_detail: null,
      release_date: '2026-04-01',
      duration: '20分',
      genre: [],
      cast: [],
      director: null,
      release_year: null,
      price: 1000,
      rental_price: 500,
      is_published: true,
      publish_at: '2026-04-01T00:00:00.000Z',
      unpublish_at: null,
      view_window_days: 2,
      created_at: '2026-04-01T00:00:00.000Z',
      updated_at: '2026-04-01T00:00:00.000Z',
    });
    mockApi.addWatchHistory.mockResolvedValue({
      ok: true,
      item: {
        id: 'history-1',
        movie_id: 'movie-1',
        title: '作品A',
        thumbnail: null,
        watched_at: '2026-04-13T10:00:00.000Z',
      },
    });
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

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('records watch history after loading the movie for members', async () => {
    render(
      <MemoryRouter initialEntries={['/watch/movie-1']}>
        <Routes>
          <Route path="/watch/:id" element={<MoviePlayerPage />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(mockApi.getMovie).toHaveBeenCalledWith('movie-1');
    });

    await waitFor(() => {
      expect(mockApi.addWatchHistory).toHaveBeenCalledWith('movie-1');
    });
  });

  it('shows membership CTA for registered users without active subscription', async () => {
    mockApi.getSubscriptionCurrent.mockResolvedValue({
      active: false,
      subscription: null,
    });

    render(
      <MemoryRouter initialEntries={['/watch/movie-1']}>
        <Routes>
          <Route path="/watch/:id" element={<MoviePlayerPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(
      await screen.findByRole('button', { name: '月額 1,000 円で登録' }),
    ).toBeInTheDocument();
  });
});
