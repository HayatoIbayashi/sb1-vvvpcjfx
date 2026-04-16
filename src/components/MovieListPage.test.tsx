import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import MovieListPage from './MovieListPage';

const { mockApi, mockAuthStatus } = vi.hoisted(() => ({
  mockApi: {
    getMovies: vi.fn(),
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

vi.mock('../lib/useMembershipStatus', () => ({
  MEMBERSHIP_MONTHLY_PRICE: 1000,
  useMembershipStatus: () => ({
    accessState: 'guest',
    isLoading: false,
  }),
}));

describe('MovieListPage', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_USE_MOCK_MOVIES', 'false');
    vi.stubEnv('VITE_USE_MOCK_REVIEWS', 'false');
    mockApi.getMovies.mockReset();
    mockApi.getReviews.mockReset();
    mockApi.getMovies.mockResolvedValue({ items: [] });
    mockApi.getReviews.mockResolvedValue({ items: [] });
  });

  it('renders registered and member test list sections on the top page', async () => {
    render(
      <MemoryRouter>
        <MovieListPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(mockApi.getMovies).toHaveBeenCalledTimes(1);
    });

    expect(screen.getByRole('heading', { name: '無料会員用動画' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'メンバーシップ限定動画' })).toBeInTheDocument();
    expect(screen.getByText('無料会員テスト動画 01')).toBeInTheDocument();
    expect(screen.getByText('メンバー限定テスト動画 01')).toBeInTheDocument();
  });

  it('navigates to the movie detail page when a test card is clicked', async () => {
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

    fireEvent.click(screen.getByRole('link', { name: /無料会員テスト動画 01/ }));

    expect(await screen.findByText('動画詳細画面')).toBeInTheDocument();
  });
});
