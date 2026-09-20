import { describe, it, expect } from 'vitest';
import {
  computeMeanVector,
  computePca2D,
  fallbackPseudoEmbedding,
} from '../src/services/vectorization';

describe('Vectorization and PCA 2D Projection', () => {
  it('computeMeanVector computes normalized average vector correctly', () => {
    const v1 = [1, 0, 0];
    const v2 = [0, 1, 0];

    const mean = computeMeanVector([v1, v2]);
    expect(mean.length).toBe(3);
    // Values should be equal for dim 0 and 1, and 0 for dim 2
    expect(mean[0]).toBeCloseTo(mean[1]);
    expect(mean[2]).toBe(0);

    // Should be L2 normalized (norm = 1)
    const norm = Math.sqrt(mean[0] * mean[0] + mean[1] * mean[1] + mean[2] * mean[2]);
    expect(norm).toBeCloseTo(1.0);
  });

  it('computeMeanVector handles empty input gracefully', () => {
    expect(computeMeanVector([])).toEqual([]);
  });

  it('fallbackPseudoEmbedding produces deterministic normalized vector of desired dimension', () => {
    const text1 = 'Deep Learning with Convolutional Neural Networks';
    const text2 = 'Deep Learning with Convolutional Neural Networks';
    const text3 = 'Stem cell reprogramming for regenerative biology';

    const emb1 = fallbackPseudoEmbedding(text1, 64);
    const emb2 = fallbackPseudoEmbedding(text2, 64);
    const emb3 = fallbackPseudoEmbedding(text3, 64);

    expect(emb1.length).toBe(64);
    expect(emb1).toEqual(emb2); // Deterministic

    // Default dimension is 384
    const defaultEmb = fallbackPseudoEmbedding(text1);
    expect(defaultEmb.length).toBe(384);

    // Norm is 1.0
    const norm = Math.sqrt(emb1.reduce((sum, val) => sum + val * val, 0));
    expect(norm).toBeCloseTo(1.0);

    // Dissimilar text produces different vector
    expect(emb1).not.toEqual(emb3);
  });

  it('computePca2D reduces high-dimensional items to 2D coordinates within range', () => {
    const items = [
      { id: '1', vector: [1, 0, 0, 0] },
      { id: '2', vector: [0.9, 0.1, 0, 0] },
      { id: '3', vector: [0, 1, 0, 0] },
      { id: '4', vector: [0, 0, 1, 0] },
      { id: '5', vector: [0, 0, 0.9, 0.1] },
    ];

    const coords = computePca2D(items);
    expect(coords.length).toBe(5);

    coords.forEach((coord) => {
      expect(typeof coord.x).toBe('number');
      expect(typeof coord.y).toBe('number');
      expect(isNaN(coord.x)).toBe(false);
      expect(isNaN(coord.y)).toBe(false);
      // Scaled within reasonable bounds
      expect(Math.abs(coord.x)).toBeLessThanOrEqual(100);
      expect(Math.abs(coord.y)).toBeLessThanOrEqual(100);
    });

    // Similar points (item 1 and 2) should have closer coordinates than dissimilar points (1 and 4)
    const dist12 = Math.hypot(coords[0].x - coords[1].x, coords[0].y - coords[1].y);
    const dist14 = Math.hypot(coords[0].x - coords[3].x, coords[0].y - coords[3].y);
    expect(dist12).toBeLessThan(dist14);
  });
});
