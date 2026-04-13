import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { VideoManagement } from './VideoManagement';

const { mockApi } = vi.hoisted(() => ({
  mockApi: {
    getAdminMovies: vi.fn(),
    createAdminMovie: vi.fn(),
    updateAdminMovie: vi.fn(),
    deleteAdminMovie: vi.fn(),
  },
}));

vi.mock('../../lib/useApiClient', () => ({
  default: () => mockApi,
}));

describe('VideoManagement', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_USE_MOCK_MOVIES', 'false');
    mockApi.getAdminMovies.mockReset();
    mockApi.createAdminMovie.mockReset();
    mockApi.updateAdminMovie.mockReset();
    mockApi.deleteAdminMovie.mockReset();
    mockApi.getAdminMovies.mockResolvedValue({ items: [] });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('creates a video via admin movie api', async () => {
    mockApi.createAdminMovie.mockResolvedValue({
      id: 'video-1',
      title: 'テスト動画',
      description: '説明',
      thumbnail: null,
      thumbnail_top: null,
      thumbnail_detail: null,
      release_date: '2026-04-13',
      duration: '15分',
      genre: ['テスト'],
      cast: ['出演者A'],
      director: null,
      release_year: null,
      created_at: '2026-04-13T00:00:00.000Z',
      updated_at: '2026-04-13T00:00:00.000Z',
      price: 1200,
      rental_price: 500,
    });

    render(<VideoManagement />);

    await waitFor(() => {
      expect(mockApi.getAdminMovies).toHaveBeenCalledTimes(1);
    });

    fireEvent.click(screen.getByRole('button', { name: '新規動画を追加' }));
    fireEvent.change(screen.getByLabelText('タイトル'), { target: { value: 'テスト動画' } });
    fireEvent.change(screen.getByLabelText('説明'), { target: { value: '説明' } });
    fireEvent.change(screen.getByLabelText('公開日'), { target: { value: '2026-04-13' } });
    fireEvent.change(screen.getByLabelText('再生時間'), { target: { value: '15分' } });
    fireEvent.change(screen.getByLabelText('本編価格'), { target: { value: '1200' } });
    fireEvent.change(screen.getByLabelText('レンタル価格'), { target: { value: '500' } });
    fireEvent.change(screen.getByLabelText('ジャンル'), { target: { value: 'テスト' } });
    fireEvent.change(screen.getByLabelText('出演者'), { target: { value: '出演者A' } });

    fireEvent.click(screen.getByRole('button', { name: '登録する' }));

    await waitFor(() => {
      expect(mockApi.createAdminMovie).toHaveBeenCalledWith({
        title: 'テスト動画',
        description: '説明',
        thumbnail: null,
        thumbnail_top: null,
        thumbnail_detail: null,
        release_date: '2026-04-13',
        duration: '15分',
        price: 1200,
        rental_price: 500,
        genre: ['テスト'],
        cast: ['出演者A'],
      });
    });

    expect(mockApi.createAdminMovie.mock.calls[0][0]).not.toHaveProperty('director');
    expect(mockApi.createAdminMovie.mock.calls[0][0]).not.toHaveProperty('release_year');
    expect(await screen.findByText('テスト動画')).toBeInTheDocument();
  });
});
