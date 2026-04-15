import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import WatchlistPage from './WatchlistPage';

const { mockApi, mockAuthStatus } = vi.hoisted(() => ({
  mockApi: {
    getWatchlist: vi.fn(),
    removeFromWatchlist: vi.fn(),
  },
  mockAuthStatus: {
    isAuthenticated: true,
    logoutAll: vi.fn(),
  },
}));

vi.mock('../lib/useApiClient', () => ({
  default: () => mockApi,
}));

vi.mock('../lib/authBridge', () => ({
  useAuthStatus: () => mockAuthStatus,
}));

describe('WatchlistPage', () => {
  beforeEach(() => {
    mockApi.getWatchlist.mockReset();
    mockApi.removeFromWatchlist.mockReset();
    mockAuthStatus.isAuthenticated = true;
    mockApi.getWatchlist.mockResolvedValue({
      items: [
        {
          id: 'movie-1',
          title: 'マイリスト作品',
          description: 'あとで見る作品です',
          thumbnail: 'https://example.com/thumb.jpg',
          thumbnail_top: null,
          thumbnail_detail: null,
          release_date: '2026-04-01',
          duration: '20分',
          genre: [],
          cast: [],
          director: null,
          release_year: null,
          price: 1200,
          rental_price: 500,
          is_published: true,
          publish_at: '2026-04-01T00:00:00.000Z',
          unpublish_at: null,
          view_window_days: 2,
          created_at: '2026-04-01T00:00:00.000Z',
          updated_at: '2026-04-01T00:00:00.000Z',
        },
      ],
    });
    mockApi.removeFromWatchlist.mockResolvedValue({
      ok: true,
      deleted: true,
    });
  });

  it('loads watchlist and removes an item', async () => {
    render(
      <MemoryRouter initialEntries={['/watchlist']}>
        <Routes>
          <Route path="/watchlist" element={<WatchlistPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText('マイリスト作品')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '外す' }));

    await waitFor(() => {
      expect(mockApi.removeFromWatchlist).toHaveBeenCalledWith('movie-1');
    });
    await waitFor(() => {
      expect(screen.queryByText('マイリスト作品')).not.toBeInTheDocument();
    });
  });
});
