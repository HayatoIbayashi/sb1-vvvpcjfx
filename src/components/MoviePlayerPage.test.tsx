import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import MoviePlayerPage from './MoviePlayerPage';

const { mockApi, mockAuthStatus, mockLinkToStorageFile, mockReactPlayer } = vi.hoisted(() => ({
  mockApi: {
    getMovie: vi.fn(),
    addWatchHistory: vi.fn(),
    getSubscriptionCurrent: vi.fn(),
  },
  mockAuthStatus: {
    isAuthenticated: true,
  },
  mockLinkToStorageFile: vi.fn(),
  mockReactPlayer: vi.fn(),
}));

vi.mock('../lib/useApiClient', () => ({
  default: () => mockApi,
}));

vi.mock('../lib/authBridge', () => ({
  useAuthStatus: () => mockAuthStatus,
}));

vi.mock('../lib/storageUtils', () => ({
  AWS_SAMPLE_VIDEO_STORAGE_PATH: 'public/sample_output1.mp4',
  linkToStorageFile: mockLinkToStorageFile,
}));

vi.mock('react-player', () => ({
  default: (props: { url: string; playing: boolean }) => {
    mockReactPlayer(props);
    return (
      <div
        data-testid="react-player"
        data-url={props.url}
        data-playing={props.playing ? 'true' : 'false'}
      >
        player
      </div>
    );
  },
}));

describe('MoviePlayerPage', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_USE_MOCK_MOVIES', 'false');
    vi.stubEnv('VITE_USE_MOCK_WATCH_HISTORY', 'false');
    mockApi.getMovie.mockReset();
    mockApi.addWatchHistory.mockReset();
    mockApi.getSubscriptionCurrent.mockReset();
    mockLinkToStorageFile.mockReset();
    mockReactPlayer.mockReset();

    mockApi.getMovie.mockResolvedValue({
      id: 'movie-1',
      title: '動画A',
      description: '説明',
      thumbnail: null,
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
    mockApi.addWatchHistory.mockResolvedValue({
      ok: true,
      item: {
        id: 'history-1',
        movie_id: 'movie-1',
        title: '動画A',
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
    mockLinkToStorageFile.mockResolvedValue('https://example.com/movie.mp4');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('records watch history when playback starts for members', async () => {
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

    expect(mockApi.addWatchHistory).not.toHaveBeenCalled();

    fireEvent.click(await screen.findByRole('button', { name: '再生' }));

    await waitFor(() => {
      expect(mockApi.addWatchHistory).toHaveBeenCalledWith('movie-1');
    });
  });

  it('does not record watch history for logged-in users before membership registration', async () => {
    mockApi.getSubscriptionCurrent.mockResolvedValue({
      active: false,
      subscription: null,
    });
    mockApi.getMovie.mockResolvedValue({
      id: 'movie-1',
      title: '動画A',
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
      price: 1,
      rental_price: 1,
      is_published: true,
      publish_at: '2026-04-01T00:00:00.000Z',
      unpublish_at: null,
      view_window_days: 2,
      created_at: '2026-04-01T00:00:00.000Z',
      updated_at: '2026-04-01T00:00:00.000Z',
    });

    render(
      <MemoryRouter initialEntries={['/watch/movie-1']}>
        <Routes>
          <Route path="/watch/:id" element={<MoviePlayerPage />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(mockApi.addWatchHistory).not.toHaveBeenCalled();
    });
  });

  it('autoplays the AWS sample video when opened with autoplay', async () => {
    render(
      <MemoryRouter initialEntries={['/watch/movie-1?autoplay=1']}>
        <Routes>
          <Route path="/watch/:id" element={<MoviePlayerPage />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(mockLinkToStorageFile).toHaveBeenCalledWith('public/sample_output1.mp4');
    });

    await waitFor(() => {
      expect(screen.getByTestId('react-player')).toHaveAttribute('data-url', 'https://example.com/movie.mp4');
      expect(screen.getByTestId('react-player')).toHaveAttribute('data-playing', 'true');
    });
    expect(screen.getAllByText('ホラー描写').length).toBeGreaterThan(0);
  });

  it('uses the local mock movie for non-uuid ids without calling the movie api', async () => {
    render(
      <MemoryRouter initialEntries={['/watch/2']}>
        <Routes>
          <Route path="/watch/:id" element={<MoviePlayerPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect((await screen.findAllByText('RE:BORN')).length).toBeGreaterThan(0);
    expect(mockApi.getMovie).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: '再生' }));

    await waitFor(() => {
      expect(mockApi.addWatchHistory).not.toHaveBeenCalled();
    });
  });

  it('shows membership CTA for registered users on member-only movies', async () => {
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
