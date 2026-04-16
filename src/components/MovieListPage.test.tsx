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
    mockApi.getMovies.mockResolvedValue({
      items: [
        {
          id: 'movie-public',
          title: '公開動画',
          description: '公開作品です。',
          thumbnail: null,
          thumbnail_top: null,
          thumbnail_detail: null,
          release_date: '2026-04-01',
          duration: '20:00',
          genre: [],
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
          title: '登録後動画',
          description: 'ログイン後に案内する作品です。',
          thumbnail: null,
          thumbnail_top: null,
          thumbnail_detail: null,
          release_date: '2026-04-02',
          duration: '25:00',
          genre: [],
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
    mockAuthStatus.isAuthenticated = false;
    mockMembershipStatus.accessState = 'guest';
  });

  it('shows only the public catalog section for guests', async () => {
    render(
      <MemoryRouter>
        <MovieListPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(mockApi.getMovies).toHaveBeenCalledTimes(1);
    });

    expect(screen.getByRole('heading', { name: '配信内容一覧' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'ログイン後のおすすめ動画' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'ログイン後にご案内する動画' })).not.toBeInTheDocument();
  });

  it('shows the post-login test list and member guidance after login', async () => {
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

    expect(screen.getByRole('heading', { name: 'ログイン後のおすすめ動画' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'ログイン後にご案内する動画' })).toBeInTheDocument();
    expect(screen.getByText('ログイン後テスト動画 01')).toBeInTheDocument();
  });

  it('navigates to the movie detail page when a post-login test card is clicked', async () => {
    mockAuthStatus.isAuthenticated = true;
    mockMembershipStatus.accessState = 'registered';

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

    fireEvent.click(screen.getByRole('link', { name: /ログイン後テスト動画 01/ }));

    expect(await screen.findByText('動画詳細画面')).toBeInTheDocument();
  });
});
