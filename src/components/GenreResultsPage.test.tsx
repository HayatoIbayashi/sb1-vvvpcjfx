import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import GenreResultsPage from './GenreResultsPage';

const { mockApi, mockAuthStatus } = vi.hoisted(() => ({
  mockApi: {
    getMovies: vi.fn(),
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

describe('GenreResultsPage', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_USE_MOCK_MOVIES', 'false');
    mockApi.getMovies.mockReset();
    mockApi.getMovies.mockResolvedValue({
      items: [
        {
          id: 'movie-action',
          title: 'Action Movie',
          description: 'Action description',
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
        },
        {
          id: 'movie-drama',
          title: 'Drama Movie',
          description: 'Drama description',
          thumbnail: null,
          thumbnail_top: null,
          thumbnail_detail: null,
          release_date: '2026-04-02',
          duration: '25:00',
          genre: ['Drama'],
          cast: [],
          director: null,
          release_year: null,
          created_at: '2026-04-02T00:00:00.000Z',
          updated_at: '2026-04-02T00:00:00.000Z',
          price: 0,
          rental_price: 0,
        },
      ],
    });
  });

  it('filters movies by route genre and opens detail pages', async () => {
    render(
      <MemoryRouter initialEntries={['/genres/Action']}>
        <Routes>
          <Route path="/genres/:genreName" element={<GenreResultsPage />} />
          <Route path="/movies/:id" element={<div>detail page</div>} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(mockApi.getMovies).toHaveBeenCalledTimes(1);
    });

    expect(await screen.findByText('Action Movie')).toBeInTheDocument();
    expect(screen.queryByText('Drama Movie')).not.toBeInTheDocument();
    expect(screen.queryByText('\u516c\u958b\u65e5')).not.toBeInTheDocument();
    expect(screen.queryByText('2026-04-01')).not.toBeInTheDocument();

    fireEvent.click(screen.getByAltText('Action Movie'));
    expect(await screen.findByText('detail page')).toBeInTheDocument();
  });

  it('shows the empty state when no movies match the genre', async () => {
    render(
      <MemoryRouter initialEntries={['/genres/Horror']}>
        <Routes>
          <Route path="/genres/:genreName" element={<GenreResultsPage />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(mockApi.getMovies).toHaveBeenCalledTimes(1);
    });

    expect(await screen.findByText('このジャンルの作品はまだありません。')).toBeInTheDocument();
  });
});
