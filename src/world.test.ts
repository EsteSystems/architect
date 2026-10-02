import { describe, expect, it } from 'vitest';
import { isComplete, resolve, type CompleteSelection } from './selection';
import { canPlace, createWorld, demolish, footprint, pieceAt, place, snapPlacement } from './world';

const sel = (...path: string[]): CompleteSelection => {
  const s = resolve(path);
  if (!isComplete(s)) throw new Error('incomplete ' + path.join('/'));
  return s;
};

const FOUNDATION = sel('foundation', 'fsquare', 'stone', 'roughcut');
const WALL = sel('wall', 'wfull', 'wood', 'plank');
const rich = { wood: 5000, stone: 5000, metal: 5000, alloy: 5000 };

describe('world', () => {
  it('places foundations on free ground and charges the material', () => {
    let w = createWorld(rich);
    w = place(w, FOUNDATION, 2, 2, 0);
    expect(w.pieces).toHaveLength(1);
    expect(w.resources.stone).toBe(5000 - 180);
    expect(canPlace(w, FOUNDATION, 3, 3, 0)).toEqual({ ok: false, reason: 'Blocked by a foundation' });
    expect(canPlace(w, FOUNDATION, 4, 2, 0).ok).toBe(true);
  });

  it('requires a foundation under every other piece', () => {
    let w = createWorld(rich);
    expect(canPlace(w, WALL, 2, 2, 0)).toEqual({ ok: false, reason: 'Needs a foundation' });
    w = place(w, FOUNDATION, 2, 2, 0);
    w = place(w, WALL, 2, 2, 0);
    expect(w.pieces).toHaveLength(2);
    expect(canPlace(w, WALL, 2, 2, 0)).toEqual({ ok: false, reason: 'Space taken' });
    expect(canPlace(w, WALL, 2, 2, 180).ok).toBe(true);
  });

  it('treats the edge between neighbouring foundations as one spot', () => {
    let w = createWorld(rich);
    w = place(w, FOUNDATION, 2, 2, 0);
    w = place(w, FOUNDATION, 4, 2, 0);
    w = place(w, WALL, 2, 2, 90); // east edge of the west foundation, x = 4
    expect(w.pieces).toHaveLength(3);
    expect(canPlace(w, WALL, 4, 2, 270)).toEqual({ ok: false, reason: 'Space taken' }); // same line from the east foundation
    expect(canPlace(w, WALL, 4, 2, 90).ok).toBe(true);
    // A foundation offset by one cell still shares half that line.
    w = place(w, FOUNDATION, 4, 4, 0);
    w = place(w, FOUNDATION, 2, 5, 0);
    expect(canPlace(w, WALL, 2, 5, 90).ok).toBe(true);
    w = place(w, WALL, 4, 4, 270);
    expect(canPlace(w, WALL, 2, 5, 90)).toEqual({ ok: false, reason: 'Space taken' });
  });

  it('treats the corner between neighbouring foundations as one spot', () => {
    const PILLAR = sel('support', 'pillar', 'wood', 'plank');
    let w = createWorld(rich);
    w = place(w, FOUNDATION, 2, 2, 0);
    w = place(w, FOUNDATION, 4, 2, 0);
    w = place(w, PILLAR, 2, 2, 90); // north-east corner of the west foundation, point (4, 2)
    expect(canPlace(w, PILLAR, 4, 2, 0)).toEqual({ ok: false, reason: 'Space taken' });
    expect(canPlace(w, PILLAR, 4, 2, 90).ok).toBe(true);
  });

  it('refuses pieces the player cannot afford', () => {
    const w = createWorld({ ...rich, stone: 100 });
    expect(canPlace(w, FOUNDATION, 0, 0, 0)).toEqual({ ok: false, reason: 'Not enough stone' });
    expect(place(w, FOUNDATION, 0, 0, 0)).toBe(w);
  });

  it('puts walls on the edge picked by rotation', () => {
    const base = { category: 'wall' as const, variant: 'wfull', col: 1, row: 1 };
    expect(footprint({ ...base, rot: 0 })).toEqual({ x: 48, y: 48, w: 96, h: 16 });
    expect(footprint({ ...base, rot: 90 })).toEqual({ x: 128, y: 48, w: 16, h: 96 });
    expect(footprint({ ...base, rot: 180 })).toEqual({ x: 48, y: 128, w: 96, h: 16 });
    expect(footprint({ ...base, rot: 270 })).toEqual({ x: 48, y: 48, w: 16, h: 96 });
  });

  it('puts a wall on the foundation edge nearest the pointer', () => {
    const w = place(createWorld(rich), FOUNDATION, 4, 4, 0);
    const wall = { category: 'wall' as const, variant: 'wfull' };
    const at = (lx: number, lz: number) => snapPlacement(w, wall, (4 + lx) * 48, (4 + lz) * 48, 0);
    expect(at(1, 0.2)).toEqual({ col: 4, row: 4, rot: 0 });
    expect(at(1.9, 1)).toEqual({ col: 4, row: 4, rot: 90 });
    expect(at(1, 1.8)).toEqual({ col: 4, row: 4, rot: 180 });
    expect(at(0.1, 1.2)).toEqual({ col: 4, row: 4, rot: 270 });
  });

  it('puts a pillar on the nearest corner', () => {
    const w = place(createWorld(rich), FOUNDATION, 4, 4, 0);
    const pillar = { category: 'support' as const, variant: 'pillar' };
    expect(snapPlacement(w, pillar, (4 + 1.7) * 48, (4 + 1.6) * 48, 0).rot).toBe(180);
    expect(snapPlacement(w, pillar, (4 + 0.2) * 48, (4 + 0.3) * 48, 90).rot).toBe(0);
  });

  it('centres a wall\'s base on the pointer off a foundation', () => {
    const w = createWorld(rich);
    const wall = { category: 'wall' as const, variant: 'wfull' };
    for (const rot of [0, 90, 180, 270] as const) {
      const p = snapPlacement(w, wall, 10 * 48, 8 * 48, rot);
      const r = footprint({ ...wall, ...p });
      // The pointer lands on the wall's footprint, at the middle of its run.
      expect(r.x <= 480 && 480 <= r.x + r.w && r.y <= 384 && 384 <= r.y + r.h).toBe(true);
      expect(Math.abs(r.x + r.w / 2 - 480) + Math.abs(r.y + r.h / 2 - 384)).toBeLessThanOrEqual(8);
    }
  });

  it('centres blocks on the pointer and keeps them on the ground', () => {
    const w = createWorld(rich);
    expect(snapPlacement(w, { category: 'foundation', variant: 'fsquare' }, 100, 100, 0)).toEqual({ col: 1, row: 1, rot: 0 });
    expect(snapPlacement(w, { category: 'foundation', variant: 'fsquare' }, -50, 2000, 0)).toEqual({ col: 0, row: 16, rot: 0 });
  });

  it('demolishing a foundation takes its pieces down and refunds half', () => {
    let w = createWorld(rich);
    w = place(w, FOUNDATION, 2, 2, 0);
    w = place(w, WALL, 2, 2, 0);
    const found = pieceAt(w, 2 * 48 + 48, 2 * 48 + 48)!;
    expect(found.category).toBe('foundation');
    expect(pieceAt(w, 2 * 48 + 48, 2 * 48 + 4)!.category).toBe('wall');
    w = demolish(w, found.uid);
    expect(w.pieces).toHaveLength(0);
    expect(w.resources.stone).toBe(5000 - 180 + 90);
    expect(w.resources.wood).toBe(5000 - 120 + 60);
  });
});
