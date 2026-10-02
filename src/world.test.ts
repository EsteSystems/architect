import { describe, expect, it } from 'vitest';
import { isComplete, resolve, type CompleteSelection } from './selection';
import { canPlace, createWorld, demolish, footprint, pieceAt, place, snapAnchor } from './world';

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

  it('snaps non-foundation ghosts onto the foundation under the pointer', () => {
    const w = place(createWorld(rich), FOUNDATION, 4, 4, 0);
    expect(snapAnchor(w, 'wall', 4 * 48 + 90, 4 * 48 + 10)).toEqual({ col: 4, row: 4 });
    expect(snapAnchor(w, 'foundation', 100, 100)).toEqual({ col: 1, row: 1 });
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
