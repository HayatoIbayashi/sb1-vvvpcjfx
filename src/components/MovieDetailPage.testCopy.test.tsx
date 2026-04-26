import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
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
    isAuthenticated: false,
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

describe('MovieDetailPage test detail copy', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_USE_MOCK_MOVIES', 'false');

    mockApi.getMovie.mockReset();
    mockApi.getWatchlist.mockReset();
    mockApi.getSubscriptionCurrent.mockReset();

    mockApi.getMovie.mockResolvedValue({
      id: 'movie-2',
      title: '元データタイトル',
      description: '元データ説明',
      thumbnail: 'https://example.com/thumb.jpg',
      thumbnail_top: null,
      thumbnail_detail: null,
      release_date: '2026-04-20',
      duration: '20分',
      genre: [],
      cast: [],
      director: null,
      release_year: null,
      price: 1,
      rental_price: 0,
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
  });

  it('replaces the detail wording with test copy when testDetailId is present', async () => {
    render(
      <MemoryRouter initialEntries={['/movies/movie-2?testDetailId=member-test-1']}>
        <Routes>
          <Route path="/movies/:id" element={<MovieDetailPage />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(mockApi.getMovie).toHaveBeenCalledWith('movie-2');
    });

    expect(await screen.findByRole('heading', { name: 'ログイン後詳細テスト 01' })).toBeInTheDocument();
    expect(screen.getByText('ログイン後に表示する動画の詳細画面で、説明文や導線の見え方を確認するためのテスト文言です。')).toBeInTheDocument();
    expect(screen.getByText('この詳細画面はログイン後に表示する動画用のテスト文言に差し替えています。')).toBeInTheDocument();
    expect(screen.getByText('2026-05-01')).toBeInTheDocument();
    expect(screen.getByText('00:42:00')).toBeInTheDocument();
    expect(screen.queryByText('元データタイトル')).not.toBeInTheDocument();
  });
});
