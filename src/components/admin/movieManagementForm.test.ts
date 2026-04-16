import { describe, expect, it } from 'vitest';
import {
  buildMoviePayload,
  createEmptyFormData,
  createMovieFormData,
  splitCsv,
} from './movieManagementForm';

describe('movieManagementForm', () => {
  it('creates form defaults with public access tier and no selected video file', () => {
    const formData = createEmptyFormData();

    expect(formData).not.toHaveProperty('director');
    expect(formData).not.toHaveProperty('release_year');
    expect(formData.release_date).toBe('');
    expect(formData.genre).toEqual([]);
    expect(formData.accessTier).toBe('public');
    expect(formData.videoFile).toBeNull();
  });

  it('builds admin payload from access tier markers without including the selected video file', () => {
    const payload = buildMoviePayload({
      title: '動画タイトル',
      description: '説明',
      thumbnail: '',
      thumbnail_top: '',
      thumbnail_detail: '',
      release_date: '2026-04-13',
      duration: '15:00',
      genre: ['アクション'],
      cast: ['出演者'],
      accessTier: 'registered',
      videoFile: new File(['dummy'], 'sample.mp4', { type: 'video/mp4' }),
    });

    expect(payload).toEqual({
      title: '動画タイトル',
      description: '説明',
      thumbnail: null,
      thumbnail_top: null,
      thumbnail_detail: null,
      release_date: '2026-04-13',
      duration: '15:00',
      genre: ['アクション'],
      cast: ['出演者'],
      price: 1,
      rental_price: 0,
    });
  });

  it('normalizes release date for edit forms', () => {
    const formData = createMovieFormData({
      id: 'movie-1',
      title: '動画',
      description: null,
      thumbnail: null,
      thumbnail_top: null,
      thumbnail_detail: null,
      release_date: '2024/12/6',
      duration: null,
      genre: [],
      cast: [],
      director: null,
      release_year: null,
      created_at: '2026-04-01T00:00:00.000Z',
      updated_at: '2026-04-01T00:00:00.000Z',
      price: 1,
      rental_price: 1,
    });

    expect(formData.accessTier).toBe('member');
    expect(formData.release_date).toBe('2024-12-06');
    expect(formData.videoFile).toBeNull();
  });

  it('splits comma separated values and trims blanks', () => {
    expect(splitCsv('A, B, ,C')).toEqual(['A', 'B', 'C']);
  });
});
