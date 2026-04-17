import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import MovieListPage from './MovieListPage';

const { mockApi, mockAuthStatus, mockMembershipStatus } = vi.hoisted(() => ({
  mockApi: {
    getMovies: vi.fn(),
    getReviews: vi.fn(),
    getProfile: vi.fn(),
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
    mockApi.getProfile.mockReset();
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
    mockApi.getProfile.mockResolvedValue({
      id: 'profile-1',
      email: 'tester@example.com',
      display_name: 'Tester',
      gender: null,
      age: null,
      prefecture: null,
      recommendation_preferences: {
        hiddenCategoryIds: [],
        warningCategoryIds: [],
        desiredGenreIds: ['horror', 'gambling', 'sexual-content'],
      },
      created_at: '2026-04-01T00:00:00.000Z',
      updated_at: '2026-04-01T00:00:00.000Z',
    });
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
    expect(screen.getByRole('heading', { name: '紹介動画' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'おすすめ動画:公開動画' })).toBeInTheDocument();
    expect(screen.getAllByText('アクション').length).toBeGreaterThan(0);
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
    expect(await screen.findByText('ホラー描写')).toBeInTheDocument();
  });

  it('opens the movie detail page when a post-login sample card is clicked', async () => {
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

    expect(screen.getByText('ログイン後テスト動画 01')).toBeInTheDocument();
    expect(await screen.findByText('ホラー描写')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('link', { name: '動画:ログイン後テスト動画 01' }));

    expect(await screen.findByText('動画詳細画面')).toBeInTheDocument();
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

  it('shows public fallback cards instead of the empty message when the movie list is empty', async () => {
    mockApi.getMovies.mockResolvedValue({ items: [] });

    render(
      <MemoryRouter>
        <MovieListPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(mockApi.getMovies).toHaveBeenCalledTimes(1);
    });

    expect(screen.getByRole('heading', { name: '紹介動画' })).toBeInTheDocument();
    expect(screen.getByText('配信テスト紹介動画 01')).toBeInTheDocument();
    expect(screen.queryByText('表示できる動画がありません。')).not.toBeInTheDocument();
  });

  it('shows member fallback cards for logged-in users when member movies are missing', async () => {
    mockAuthStatus.isAuthenticated = true;
    mockMembershipStatus.accessState = 'registered';
    mockApi.getMovies.mockResolvedValue({
      items: [
        {
          id: 'movie-public-only',
          title: '公開動画のみ',
          description: '公開作品だけが返るケースです。',
          thumbnail: null,
          thumbnail_top: null,
          thumbnail_detail: null,
          release_date: '2026-04-10',
          duration: '21:00',
          genre: ['アクション'],
          cast: [],
          director: null,
          release_year: null,
          created_at: '2026-04-10T00:00:00.000Z',
          updated_at: '2026-04-10T00:00:00.000Z',
          price: 0,
          rental_price: 0,
        },
      ],
    });

    render(
      <MemoryRouter>
        <MovieListPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(mockApi.getMovies).toHaveBeenCalledTimes(1);
    });

    expect(screen.getByRole('heading', { name: 'ホラー描写' })).toBeInTheDocument();
    expect(screen.getByText('会員向けテスト動画 01')).toBeInTheDocument();
  });
});
