import { describe, expect, it } from 'vitest';
import { cycleMaterial, cycleTexture, isComplete, pick, resolve, stats } from './selection';

describe('selection', () => {
  it('resolves a full path', () => {
    const sel = resolve(['wall', 'doorway', 'stone', 'brick']);
    expect(isComplete(sel)).toBe(true);
    expect(sel.texture?.label).toBe('Brick');
  });

  it('ignores ids that do not belong under their parent', () => {
    const sel = resolve(['wall', 'fsquare', 'stone']);
    expect(sel.variant).toBeUndefined();
    expect(sel.material).toBeUndefined();
  });

  it('picks, replaces and un-picks the deepest choice', () => {
    expect(pick(['wall', 'doorway'], 1, 'window')).toEqual(['wall', 'window']);
    expect(pick(['wall', 'doorway'], 1, 'doorway')).toEqual(['wall']);
    expect(pick(['wall', 'doorway', 'stone'], 0, 'roof')).toEqual(['roof']);
  });

  it('keeps the material and texture when switching variant', () => {
    const finish = ['stone', 'brick'] as const;
    expect(pick(['wall', 'doorway', 'stone', 'brick'], 1, 'window', finish)).toEqual(['wall', 'window', 'stone', 'brick']);
    expect(pick(['floor'], 1, 'flsq', finish)).toEqual(['floor', 'flsq', 'stone', 'brick']);
    // Re-clicking the current variant still steps back to choose a different material.
    expect(pick(['wall', 'doorway', 'stone', 'brick'], 1, 'doorway', finish)).toEqual(['wall', 'doorway']);
  });

  it('cycles material, keeping the texture only when the new material has it', () => {
    expect(cycleMaterial(['wall', 'doorway', 'stone', 'brick'], 1)).toEqual(['wall', 'doorway', 'metal', 'corrugated']);
    expect(cycleMaterial(['wall', 'doorway', 'twig', 'lashed'], -1)).toEqual(['wall', 'doorway', 'armored', 'plated']);
    expect(cycleMaterial(['wall', 'doorway'], 1)).toEqual(['wall', 'doorway', 'twig', 'lashed']);
    expect(cycleMaterial(['wall'], 1)).toEqual(['wall']);
  });

  it('cycles texture within the material', () => {
    expect(cycleTexture(['wall', 'doorway', 'stone', 'slate'])).toEqual(['wall', 'doorway', 'stone', 'roughcut']);
    expect(cycleTexture(['wall', 'doorway', 'stone'])).toEqual(['wall', 'doorway', 'stone', 'roughcut']);
  });

  it('computes cost and health like the design', () => {
    const { variant, material } = resolve(['wall', 'doorway', 'stone']);
    expect(stats(variant!, material!)).toEqual({ cost: 126, hp: 336 });
    const pillar = resolve(['support', 'pillar', 'armored']);
    expect(stats(pillar.variant!, pillar.material!)).toEqual({ cost: 5, hp: 950 });
  });
});
