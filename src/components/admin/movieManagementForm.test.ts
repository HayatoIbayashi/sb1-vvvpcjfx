import { describe, expect, it } from 'vitest';
import { buildMoviePayload, createEmptyFormData, splitCsv } from './movieManagementForm';

describe('movieManagementForm', () => {
  it('creates form defaults without director and release year', () => {
    const formData = createEmptyFormData();

    expect(formData).not.toHaveProperty('director');
    expect(formData).not.toHaveProperty('release_year');
    expect(formData.release_date).toBe('');
    expect(formData.genre).toEqual([]);
  });

  it('builds admin payload without director and release year', () => {
    const payload = buildMoviePayload({
      title: '動画タイトル',
      description: '説明',
      release_date: '2026-04-13',
      duration: '15:00',
      price: 1200,
      rental_price: 500,
      genre: ['教育'],
      cast: ['講師A'],
    });

    expect(payload).toEqual({
      title: '動画タイトル',
      description: '説明',
      thumbnail: null,
      thumbnail_top: null,
      thumbnail_detail: null,
      release_date: '2026-04-13',
      duration: '15:00',
      price: 1200,
      rental_price: 500,
      genre: ['教育'],
      cast: ['講師A'],
    });
    expect(payload).not.toHaveProperty('director');
    expect(payload).not.toHaveProperty('release_year');
  });

  it('splits comma separated values and trims blanks', () => {
    expect(splitCsv('A, B, ,C')).toEqual(['A', 'B', 'C']);
  });
});
