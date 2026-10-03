import { describe, expect, it } from 'vitest';
import { Box3, Vector3, type BufferGeometry } from 'three';
import { FOUNDATION_H, WALL_H, box, pieceGeometry } from './geometry';
import type { Piece } from '../world';

const piece = (category: Piece['category'], variant: string, rot: Piece['rot'] = 0): Piece => ({
  uid: 1, category, variant, material: 'stone', texture: 'brick', col: 4, row: 2, rot,
});

function bounds(gs: BufferGeometry[]) {
  const b = new Box3();
  for (const g of gs) {
    g.computeBoundingBox();
    b.union(g.boundingBox!);
  }
  return b;
}

describe('piece geometry', () => {
  it('builds boxes with outward-facing normals', () => {
    const g = box(0, 2, 0, 1, 0, 2);
    const pos = g.getAttribute('position');
    const nrm = g.getAttribute('normal');
    const centre = new Vector3(1, 0.5, 1);
    for (let i = 0; i < pos.count; i++) {
      const out = new Vector3(pos.getX(i), pos.getY(i), pos.getZ(i)).sub(centre);
      expect(out.dot(new Vector3(nrm.getX(i), nrm.getY(i), nrm.getZ(i)))).toBeGreaterThan(0);
    }
    expect(pos.count).toBe(36);
  });

  it('puts a foundation on the ground under its 2×2 block', () => {
    const b = bounds(pieceGeometry(piece('foundation', 'fsquare')));
    expect(b.min.toArray()).toEqual([4, 0, 2]);
    expect(b.max.toArray()).toEqual([6, FOUNDATION_H, 4]);
  });

  it('stands walls on the foundation along the edge chosen by rotation', () => {
    const north = bounds(pieceGeometry(piece('wall', 'wfull', 0)));
    expect(north.min.y).toBe(FOUNDATION_H);
    expect(north.max.y).toBe(FOUNDATION_H + WALL_H);
    expect(north.max.z - north.min.z).toBeCloseTo(1 / 3);
    const east = bounds(pieceGeometry(piece('wall', 'wfull', 90)));
    expect(east.max.x).toBe(6);
    expect(east.max.x - east.min.x).toBeCloseTo(1 / 3);
  });

  it('leaves openings in doorways and windows', () => {
    expect(pieceGeometry(piece('wall', 'doorway'))).toHaveLength(3);
    expect(pieceGeometry(piece('wall', 'window'))).toHaveLength(4);
  });

  it('keeps rotated pieces inside their block', () => {
    for (const [cat, v] of [['stairs', 'su'], ['stairs', 'sl'], ['stairs', 'sspiral'], ['roof', 'rpitch'], ['foundation', 'ftri']] as const) {
      for (const rot of [0, 90, 180, 270] as const) {
        const b = bounds(pieceGeometry(piece(cat, v, rot)));
        expect(b.min.x).toBeGreaterThanOrEqual(4 - 1e-6);
        expect(b.max.x).toBeLessThanOrEqual(6 + 1e-6);
        expect(b.min.z).toBeGreaterThanOrEqual(2 - 1e-6);
        expect(b.max.z).toBeLessThanOrEqual(4 + 1e-6);
      }
    }
  });
});
