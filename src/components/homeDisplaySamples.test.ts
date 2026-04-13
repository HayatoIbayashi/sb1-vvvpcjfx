import { describe, expect, it } from 'vitest';
import { HOME_DISPLAY_SAMPLES } from './homeDisplaySamples';

describe('HOME_DISPLAY_SAMPLES', () => {
  it('provides three fixed samples for the top page test display', () => {
    expect(HOME_DISPLAY_SAMPLES).toHaveLength(3);
    expect(HOME_DISPLAY_SAMPLES.map((sample) => sample.title)).toEqual([
      'サンプル動画 01',
      'サンプル動画 02',
      'サンプル動画 03',
    ]);
  });

  it('uses inline svg images for all samples', () => {
    for (const sample of HOME_DISPLAY_SAMPLES) {
      expect(sample.image.startsWith('data:image/svg+xml')).toBe(true);
      expect(sample.description.length).toBeGreaterThan(10);
    }
  });
});
