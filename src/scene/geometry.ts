import { BufferGeometry, Float32BufferAttribute, Vector3 } from 'three';
import { CELL, footprint, type Piece } from '../world';

/** World units: one grid cell = 1. Plan x → world x, plan y → world z, up is y. */
export const FOUNDATION_H = 0.5;
export const WALL_H = 2.5;
export const FLOOR_T = 0.2;
export const ROOF_RISE = 1;
const LEVEL_TOP = FOUNDATION_H + WALL_H;

type V3 = [number, number, number];
type P2 = [number, number];

/**
 * A convex solid: polygon `poly` extruded between d0 and d1, placed by `map(u, v, d)`.
 * Triangles are wound outward and every face gets flat normals and world-aligned UVs
 * (one texture tile per 2 units), so textures keep their scale across piece sizes.
 */
export function prism(poly: P2[], d0: number, d1: number, map: (u: number, v: number, d: number) => V3): BufferGeometry {
  const bottom = poly.map(([u, v]) => map(u, v, d0));
  const top = poly.map(([u, v]) => map(u, v, d1));
  const tris: [V3, V3, V3][] = [];
  for (let i = 1; i < poly.length - 1; i++) {
    tris.push([bottom[0], bottom[i], bottom[i + 1]]);
    tris.push([top[0], top[i], top[i + 1]]);
  }
  for (let i = 0; i < poly.length; i++) {
    const j = (i + 1) % poly.length;
    tris.push([bottom[i], bottom[j], top[j]]);
    tris.push([bottom[i], top[j], top[i]]);
  }

  const all = [...bottom, ...top];
  const centroid = all.reduce((c, p) => c.add(new Vector3(...p)), new Vector3()).divideScalar(all.length);

  const pos: number[] = [];
  const nrm: number[] = [];
  const uv: number[] = [];
  const a = new Vector3();
  const b = new Vector3();
  const c = new Vector3();
  for (const tri of tris) {
    a.set(...tri[0]);
    b.set(...tri[1]);
    c.set(...tri[2]);
    const n = new Vector3().subVectors(b, a).cross(new Vector3().subVectors(c, a));
    if (n.lengthSq() < 1e-12) continue;
    n.normalize();
    const mid = new Vector3().add(a).add(b).add(c).divideScalar(3);
    const ordered = n.dot(mid.sub(centroid)) < 0 ? [a, c, b] : [a, b, c];
    if (ordered[1] === c) n.negate();
    const ax = Math.abs(n.x);
    const ay = Math.abs(n.y);
    const az = Math.abs(n.z);
    for (const p of ordered) {
      pos.push(p.x, p.y, p.z);
      nrm.push(n.x, n.y, n.z);
      if (ay >= ax && ay >= az) uv.push(p.x / 2, p.z / 2);
      else if (ax >= az) uv.push(p.z / 2, p.y / 2);
      else uv.push(p.x / 2, p.y / 2);
    }
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new Float32BufferAttribute(nrm, 3));
  g.setAttribute('uv', new Float32BufferAttribute(uv, 2));
  return g;
}

/** Axis-aligned box from min/max corners. */
export function box(x0: number, x1: number, y0: number, y1: number, z0: number, z1: number): BufferGeometry {
  return prism([[x0, z0], [x1, z0], [x1, z1], [x0, z1]], y0, y1, (u, v, d) => [u, d, v]);
}

/** Rotates a point in the block about its centre, matching the plan's clockwise rotation. */
function spin(rot: number, cx: number, cz: number) {
  const r = (rot * Math.PI) / 180;
  const cos = Math.cos(r);
  const sin = Math.sin(r);
  return (x: number, z: number): P2 => {
    const dx = x - cx;
    const dz = z - cz;
    return [cx + dx * cos - dz * sin, cz + dx * sin + dz * cos];
  };
}

/** A box given in block-local coordinates (0..2 on x and z), rotated with the piece. */
function localBox(p: Piece, x0: number, x1: number, y0: number, y1: number, z0: number, z1: number) {
  const s = spin(p.rot, 1, 1);
  const pts = ([[x0, z0], [x1, z0], [x1, z1], [x0, z1]] as P2[]).map(([x, z]) => s(x, z));
  return prism(pts, y0, y1, (u, v, d) => [p.col + u, d, p.row + v]);
}

function localPoly(p: Piece, poly: P2[], y0: number, y1: number) {
  const s = spin(p.rot, 1, 1);
  return prism(poly.map(([x, z]) => s(x, z)), y0, y1, (u, v, d) => [p.col + u, d, p.row + v]);
}

/** Apex at the north edge when unrotated, like the plan's triangle. */
const TRIANGLE: P2[] = [[0, 2], [2, 2], [1, 0]];

/** Splits a wall run (length 2 along its long axis) into solid segments around an opening. */
function wallSegments(variant: string): { a0: number; a1: number; y0: number; y1: number }[] {
  const H = WALL_H;
  switch (variant) {
    case 'whalf':
      return [{ a0: 0, a1: 2, y0: 0, y1: H / 2 }];
    case 'wlow':
      return [{ a0: 0, a1: 2, y0: 0, y1: 0.8 }];
    case 'doorway':
      return [
        { a0: 0, a1: 0.6, y0: 0, y1: H },
        { a0: 1.4, a1: 2, y0: 0, y1: H },
        { a0: 0.6, a1: 1.4, y0: 1.8, y1: H },
      ];
    case 'window':
      return [
        { a0: 0, a1: 0.6, y0: 0, y1: H },
        { a0: 1.4, a1: 2, y0: 0, y1: H },
        { a0: 0.6, a1: 1.4, y0: 0, y1: 1 },
        { a0: 0.6, a1: 1.4, y0: 1.8, y1: H },
      ];
    case 'wframe':
      return [
        { a0: 0, a1: 0.2, y0: 0, y1: H },
        { a0: 1.8, a1: 2, y0: 0, y1: H },
        { a0: 0.2, a1: 1.8, y0: H - 0.3, y1: H },
      ];
    default:
      return [{ a0: 0, a1: 2, y0: 0, y1: H }];
  }
}

function stairs(p: Piece): BufferGeometry[] {
  const out: BufferGeometry[] = [];
  const base = FOUNDATION_H;
  const n = 8;
  const rise = WALL_H / n;
  if (p.variant === 'sspiral') {
    out.push(localBox(p, 0.85, 1.15, base, base + WALL_H, 0.85, 1.15));
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * Math.PI * 2 - Math.PI / 2;
      const a1 = ((i + 1) / n) * Math.PI * 2 - Math.PI / 2;
      const r = 1;
      const wedge: P2[] = [
        [1, 1],
        [1 + r * Math.cos(a0), 1 + r * Math.sin(a0)],
        [1 + r * Math.cos(a1), 1 + r * Math.sin(a1)],
      ];
      out.push(localPoly(p, wedge, base + i * rise, base + (i + 1) * rise));
    }
    return out;
  }
  if (p.variant === 'sl') {
    // East along the south edge, landing in the south-east corner, then north.
    for (let i = 0; i < 4; i++) out.push(localBox(p, i * 0.3, (i + 1) * 0.3, base, base + (i + 1) * rise, 1.2, 2));
    out.push(localBox(p, 1.2, 2, base, base + 5 * rise, 1.2, 2));
    for (let i = 0; i < 3; i++) out.push(localBox(p, 1.2, 2, base, base + (6 + i) * rise, 0.9 - i * 0.3, 1.2 - i * 0.3));
    return out;
  }
  // U-shaped: up the west half heading north, landing, back down the east half heading south.
  for (let i = 0; i < 4; i++) out.push(localBox(p, 0, 1, base, base + (i + 1) * rise, 2 - (i + 1) * 0.375, 2 - i * 0.375));
  out.push(localBox(p, 0, 2, base, base + 5 * rise, 0, 0.5));
  for (let i = 0; i < 3; i++) out.push(localBox(p, 1, 2, base, base + (6 + i) * rise, 0.5 + i * 0.5, 0.5 + (i + 1) * 0.5));
  return out;
}

/** Geometry for a placed (or ghost) piece, in world coordinates. */
export function pieceGeometry(p: Piece): BufferGeometry[] {
  const r = footprint(p);
  const x0 = r.x / CELL;
  const z0 = r.y / CELL;
  const x1 = (r.x + r.w) / CELL;
  const z1 = (r.y + r.h) / CELL;

  switch (p.category) {
    case 'foundation':
      if (p.variant === 'ftri') return [localPoly(p, TRIANGLE, 0, FOUNDATION_H)];
      if (p.variant === 'fsteps') {
        return [
          localBox(p, 0, 2, 0, FOUNDATION_H, 0, 1.2),
          localBox(p, 0, 2, 0, (FOUNDATION_H * 2) / 3, 1.2, 1.6),
          localBox(p, 0, 2, 0, FOUNDATION_H / 3, 1.6, 2),
        ];
      }
      return [box(x0, x1, 0, FOUNDATION_H, z0, z1)];

    case 'wall': {
      const alongX = x1 - x0 > z1 - z0;
      return wallSegments(p.variant).map(({ a0, a1, y0, y1 }) =>
        alongX
          ? box(x0 + a0, x0 + a1, FOUNDATION_H + y0, FOUNDATION_H + y1, z0, z1)
          : box(x0, x1, FOUNDATION_H + y0, FOUNDATION_H + y1, z0 + a0, z0 + a1),
      );
    }

    case 'support':
      if (p.variant === 'beam') return [box(x0, x1, LEVEL_TOP - (x1 - x0 > z1 - z0 ? z1 - z0 : x1 - x0), LEVEL_TOP, z0, z1)];
      return [box(x0, x1, FOUNDATION_H, LEVEL_TOP, z0, z1)];

    case 'floor': {
      const y0 = LEVEL_TOP;
      const y1 = LEVEL_TOP + FLOOR_T;
      if (p.variant === 'fltri') return [localPoly(p, TRIANGLE, y0, y1)];
      if (p.variant === 'flframe' || p.variant === 'flhatch') {
        const w = p.variant === 'flframe' ? 0.3 : 0.6;
        return [
          box(x0, x1, y0, y1, z0, z0 + w),
          box(x0, x1, y0, y1, z1 - w, z1),
          box(x0, x0 + w, y0, y1, z0 + w, z1 - w),
          box(x1 - w, x1, y0, y1, z0 + w, z1 - w),
        ];
      }
      return [box(x0, x1, y0, y1, z0, z1)];
    }

    case 'roof': {
      const y0 = LEVEL_TOP + FLOOR_T;
      if (p.variant === 'rtri') return [localPoly(p, TRIANGLE, y0, y0 + 0.25)];
      if (p.variant === 'rpitch') {
        // Gable prism; the ridge runs east–west, or north–south when rotated 90/270.
        const ridgeX = p.rot === 0 || p.rot === 180;
        const gable: P2[] = [[0, y0], [2, y0], [1, y0 + ROOF_RISE]];
        return [
          prism(gable, 0, 2, (u, v, d) => (ridgeX ? [p.col + d, v, p.row + u] : [p.col + u, v, p.row + d])),
        ];
      }
      return [box(x0, x1, y0, y0 + 0.25, z0, z1)];
    }

    case 'stairs':
      return stairs(p);
  }
}

/** Height of the top of a piece, for placing labels above it. */
export function pieceTop(p: Pick<Piece, 'category'>): number {
  switch (p.category) {
    case 'foundation': return FOUNDATION_H;
    case 'floor': return LEVEL_TOP + FLOOR_T;
    case 'roof': return LEVEL_TOP + FLOOR_T + ROOF_RISE;
    default: return LEVEL_TOP;
  }
}
