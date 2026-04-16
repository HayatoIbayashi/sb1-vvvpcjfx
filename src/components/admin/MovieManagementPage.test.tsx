import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import MovieManagementPage from './MovieManagementPage';

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

describe('MovieManagementPage', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_USE_MOCK_MOVIES', 'false');
    mockApi.getAdminMovies.mockReset();
    mockApi.createAdminMovie.mockReset();
    mockApi.updateAdminMovie.mockReset();
    mockApi.deleteAdminMovie.mockReset();
    mockApi.getAdminMovies.mockResolvedValue({
      items: [
        {
          id: 'movie-1',
          title: '既存動画',
          description: '説明',
          thumbnail: null,
          thumbnail_top: null,
          thumbnail_detail: null,
          release_date: '2026-04-13',
          duration: '20分',
          genre: ['ドラマ'],
          cast: ['出演者'],
          director: null,
          release_year: null,
          created_at: '2026-04-13T00:00:00.000Z',
          updated_at: '2026-04-13T00:00:00.000Z',
          price: 1,
          rental_price: 1,
        },
      ],
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('renders mp4 selection ui in the create modal', async () => {
    render(
      <MemoryRouter>
        <MovieManagementPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(mockApi.getAdminMovies).toHaveBeenCalledTimes(1);
    });

    fireEvent.click(screen.getByRole('button', { name: '新規動画追加' }));

    expect(screen.getByLabelText('MP4ファイル')).toBeInTheDocument();
    expect(
      screen.getByText('Elemental 連携前のため、今は選択 UI のみです。保存しても実際のアップロードは実行されません。'),
    ).toBeInTheDocument();

    const file = new File(['video'], 'create-upload.mp4', { type: 'video/mp4' });
    fireEvent.change(screen.getByLabelText('MP4ファイル'), { target: { files: [file] } });

    expect(screen.getByText('選択中のMP4: create-upload.mp4')).toBeInTheDocument();
  });

  it('shows replacement ui in the edit modal', async () => {
    render(
      <MemoryRouter>
        <MovieManagementPage />
      </MemoryRouter>,
    );

    const editButton = await screen.findByRole('button', { name: '既存動画 を編集' });
    fireEvent.click(editButton);

    expect(
      screen.getByText('現在のファイル名は未連携のため取得できません。ここで選択した MP4 は既存ファイルの置き換え予定として扱われます。'),
    ).toBeInTheDocument();
  });
});
