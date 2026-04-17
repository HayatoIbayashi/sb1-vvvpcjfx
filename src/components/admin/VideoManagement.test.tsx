import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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

  it('creates a video via admin movie api and keeps the mp4 selection out of the payload', async () => {
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
      cast: ['出演者'],
      director: null,
      release_year: null,
      created_at: '2026-04-13T00:00:00.000Z',
      updated_at: '2026-04-13T00:00:00.000Z',
      price: 1,
      rental_price: 1,
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
    fireEvent.click(screen.getByLabelText('ジャンル:ホラー描写'));
    fireEvent.change(screen.getByLabelText('出演者'), { target: { value: '出演者' } });
    fireEvent.change(screen.getByLabelText('公開範囲'), { target: { value: 'member' } });

    const file = new File(['video'], 'new-upload.mp4', { type: 'video/mp4' });
    fireEvent.change(screen.getByLabelText('MP4ファイル'), { target: { files: [file] } });
    expect(screen.getByText('選択中のMP4: new-upload.mp4')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '追加する' }));

    await waitFor(() => {
      expect(mockApi.createAdminMovie).toHaveBeenCalledWith({
        title: 'テスト動画',
        description: '説明',
        thumbnail: null,
        thumbnail_top: null,
        thumbnail_detail: null,
        release_date: '2026-04-13',
        duration: '15分',
        genre: ['ホラー描写'],
        cast: ['出演者'],
        price: 1,
        rental_price: 1,
      });
    });

    expect(await screen.findByText('テスト動画')).toBeInTheDocument();
  });

  it('shows replacement guidance and normalizes release date for existing videos', async () => {
    mockApi.getAdminMovies.mockResolvedValue({
      items: [
        {
          id: 'video-1',
          title: '既存動画',
          description: '説明',
          thumbnail: null,
          thumbnail_top: null,
          thumbnail_detail: null,
          release_date: '2024/12/6',
          duration: '15分',
          genre: ['テスト'],
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

    render(<VideoManagement />);

    const row = (await screen.findByText('既存動画')).closest('tr');
    expect(row).not.toBeNull();

    fireEvent.click(within(row as HTMLTableRowElement).getByRole('button', { name: '既存動画 を編集' }));

    await waitFor(() => {
      expect(screen.getByLabelText('公開日')).toHaveValue('2024-12-06');
    });
    expect(screen.getByLabelText('ジャンル:テスト')).toBeChecked();

    expect(
      screen.getByText('現在のファイル名は未連携のため取得できません。ここで選択した MP4 は既存ファイルの置き換え予定として扱われます。'),
    ).toBeInTheDocument();

    const file = new File(['video'], 'replacement.mp4', { type: 'video/mp4' });
    fireEvent.change(screen.getByLabelText('MP4ファイル'), { target: { files: [file] } });

    expect(screen.getByText('選択中のMP4: replacement.mp4')).toBeInTheDocument();
  });
});
