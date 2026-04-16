import { describe, expect, it } from 'vitest';
import { HOME_DISPLAY_SAMPLES, HOME_MOVIE_LIST_TEST_SECTIONS } from './homeDisplaySamples';

describe('HOME_DISPLAY_SAMPLES', () => {
  it('provides three fixed samples for the top page test display', () => {
    expect(HOME_DISPLAY_SAMPLES).toHaveLength(3);
    expect(HOME_DISPLAY_SAMPLES.map((sample) => sample.title)).toEqual([
      'サンプル動画 01',
      'サンプル動画 02',
      'サンプル動画 03',
    ]);
  });

  it('uses inline svg images for all top page samples', () => {
    for (const sample of HOME_DISPLAY_SAMPLES) {
      expect(sample.image.startsWith('data:image/svg+xml')).toBe(true);
      expect(sample.description.length).toBeGreaterThan(10);
    }
  });
});

describe('HOME_MOVIE_LIST_TEST_SECTIONS', () => {
  it('provides fixed test sections for registered and member lists', () => {
    expect(HOME_MOVIE_LIST_TEST_SECTIONS.map((section) => section.title)).toEqual([
      '無料会員用動画',
      'メンバーシップ限定動画',
    ]);
    expect(HOME_MOVIE_LIST_TEST_SECTIONS.every((section) => section.items.length > 0)).toBe(true);
    expect(HOME_MOVIE_LIST_TEST_SECTIONS[0].items).toHaveLength(3);
    expect(HOME_MOVIE_LIST_TEST_SECTIONS[1].items).toHaveLength(3);
  });

  it('uses inline svg images for all list test samples', () => {
    for (const section of HOME_MOVIE_LIST_TEST_SECTIONS) {
      for (const item of section.items) {
        expect(item.image.startsWith('data:image/svg+xml')).toBe(true);
        expect(item.description.length).toBeGreaterThan(10);
      }
    }
  });
});
