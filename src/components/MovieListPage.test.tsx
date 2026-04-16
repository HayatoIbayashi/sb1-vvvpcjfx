import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import MovieListPage from './MovieListPage';

const { mockApi, mockAuthStatus, mockMembershipStatus } = vi.hoisted(() => ({
  mockApi: {
    getMovies: vi.fn(),
    getReviews: vi.fn(),
  },
  mockAuthStatus: {
    isAuthenticated: false,
    logoutAll: vi.fn(),
  },
  mockMembershipStatus: {
    accessState: 'guest',
    isLoading: false,
  },
}));

vi.mock('../lib/useApiClient', () => ({
  default: () => mockApi,
}));

vi.mock('../lib/authBridge', () => ({
  useAuthStatus: () => mockAuthStatus,
}));

vi.mock('../lib/useMembershipStatus', () => ({
  MEMBERSHIP_MONTHLY_PRICE: 1000,
  useMembershipStatus: () => mockMembershipStatus,
}));

describe('MovieListPage', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_USE_MOCK_MOVIES', 'false');
    vi.stubEnv('VITE_USE_MOCK_REVIEWS', 'false');

    mockApi.getMovies.mockReset();
    mockApi.getReviews.mockReset();
    mockAuthStatus.isAuthenticated = false;
    mockMembershipStatus.accessState = 'guest';

    mockApi.getMovies.mockResolvedValue({
      items: [
        {
          id: 'movie-public',
          title: '公開動画',
          description: '未ログインでも視聴できる公開動画です。',
          thumbnail: null,
          thumbnail_top: null,
          thumbnail_detail: null,
          release_date: '2026-04-01',
          duration: '20:00',
          genre: ['アクション'],
          cast: [],
          director: null,
          release_year: null,
          created_at: '2026-04-01T00:00:00.000Z',
          updated_at: '2026-04-01T00:00:00.000Z',
          price: 0,
          rental_price: 0,
        },
        {
          id: 'movie-member',
          title: 'メンバー向け動画',
          description: 'メンバーシップ登録後に視聴できる動画です。',
          thumbnail: null,
          thumbnail_top: null,
          thumbnail_detail: null,
          release_date: '2026-04-02',
          duration: '25:00',
          genre: ['ドキュメンタリー'],
          cast: [],
          director: null,
          release_year: null,
          created_at: '2026-04-02T00:00:00.000Z',
          updated_at: '2026-04-02T00:00:00.000Z',
          price: 1,
          rental_price: 1,
        },
      ],
    });
    mockApi.getReviews.mockResolvedValue({ items: [] });
  });

  it('shows recommendation cards and the public catalog for guests', async () => {
    render(
      <MemoryRouter>
        <MovieListPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(mockApi.getMovies).toHaveBeenCalledTimes(1);
    });

    expect(screen.getByRole('heading', { name: 'おすすめ動画' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '配信内容一覧' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'おすすめ動画:公開動画' })).toBeInTheDocument();
    expect(screen.getByText('アクション')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'ドキュメンタリー' })).not.toBeInTheDocument();
  });

  it('shows the member section title as the genre name after login', async () => {
    mockAuthStatus.isAuthenticated = true;
    mockMembershipStatus.accessState = 'registered';

    render(
      <MemoryRouter>
        <MovieListPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(mockApi.getMovies).toHaveBeenCalledTimes(1);
    });

    expect(screen.getByRole('heading', { name: 'ドキュメンタリー' })).toBeInTheDocument();
  });

  it('opens the movie detail page when a recommendation card is clicked', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<MovieListPage />} />
          <Route path="/movies/:id" element={<div>動画詳細画面</div>} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(mockApi.getMovies).toHaveBeenCalledTimes(1);
    });

    fireEvent.click(screen.getByRole('link', { name: 'おすすめ動画:公開動画' }));

    expect(await screen.findByText('動画詳細画面')).toBeInTheDocument();
  });
});
