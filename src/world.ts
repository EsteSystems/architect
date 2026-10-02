import { CATEGORIES, MATERIALS, TEXTURES, type CategoryId, type ResourceId, type Shape } from './catalog';
import { resolve, stats, type CompleteSelection } from './selection';

export const STAGE = { width: 1440, height: 900 };
/** Size of one background grid cell; every piece is anchored on a 2×2-cell block. */
export const CELL = 48;
export const BLOCK = CELL * 2;
/** Thickness of walls/beams and size of posts on the plan. */
export const EDGE = 16;
/** Share of a piece's cost returned on demolish. */
export const REFUND = 0.5;

export type Rotation = 0 | 90 | 180 | 270;
export type Resources = Record<ResourceId, number>;

export interface Piece {
  uid: number;
  category: CategoryId;
  variant: string;
  material: string;
  texture: string;
  col: number;
  row: number;
  rot: Rotation;
}

export interface World {
  pieces: Piece[];
  resources: Resources;
  nextUid: number;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Draw order on the plan, bottom to top. */
export const LAYER: Record<CategoryId, number> = {
  foundation: 0,
  stairs: 1,
  wall: 2,
  support: 2,
  floor: 3,
  roof: 4,
};

export function shapeOf(p: Pick<Piece, 'category' | 'variant'>): Shape {
  return CATEGORIES.find((c) => c.id === p.category)?.children.find((v) => v.id === p.variant)?.shape ?? 'square';
}

/** Footprint of a piece in stage pixels. Bars sit on the block edge, posts on its corner, both chosen by rotation. */
export function footprint(p: Pick<Piece, 'category' | 'variant' | 'col' | 'row' | 'rot'>): Rect {
  const x = p.col * CELL;
  const y = p.row * CELL;
  switch (shapeOf(p)) {
    case 'bar': {
      const edge = { 0: { x, y }, 90: { x: x + BLOCK - EDGE, y }, 180: { x, y: y + BLOCK - EDGE }, 270: { x, y } }[p.rot];
      const horizontal = p.rot === 0 || p.rot === 180;
      return { x: edge.x, y: edge.y, w: horizontal ? BLOCK : EDGE, h: horizontal ? EDGE : BLOCK };
    }
    case 'post': {
      const right = p.rot === 90 || p.rot === 180;
      const bottom = p.rot === 180 || p.rot === 270;
      return { x: right ? x + BLOCK - EDGE : x, y: bottom ? y + BLOCK - EDGE : y, w: EDGE, h: EDGE };
    }
    default:
      return { x, y, w: BLOCK, h: BLOCK };
  }
}

/**
 * The grid line a wall or beam stands on, in cells: `axis` 'h' runs east–west at z = `at`,
 * 'v' runs north–south at x = `at`, covering `from`..`to`.
 */
interface EdgeLine {
  axis: 'h' | 'v';
  at: number;
  from: number;
  to: number;
}

function edgeLine(p: Pick<Piece, 'col' | 'row' | 'rot'>): EdgeLine {
  switch (p.rot) {
    case 0: return { axis: 'h', at: p.row, from: p.col, to: p.col + 2 };
    case 180: return { axis: 'h', at: p.row + 2, from: p.col, to: p.col + 2 };
    case 90: return { axis: 'v', at: p.col + 2, from: p.row, to: p.row + 2 };
    case 270: return { axis: 'v', at: p.col, from: p.row, to: p.row + 2 };
  }
}

/** The grid point a pillar stands on, in cells. */
function cornerPoint(p: Pick<Piece, 'col' | 'row' | 'rot'>): [number, number] {
  const east = p.rot === 90 || p.rot === 180;
  const south = p.rot === 180 || p.rot === 270;
  return [p.col + (east ? 2 : 0), p.row + (south ? 2 : 0)];
}

/**
 * Whether two pieces claim the same edge or corner. Neighbouring foundations share their
 * edges and corners, so a wall on one side of the seam blocks a wall on the other.
 */
function sharesEdge(a: Pick<Piece, 'category' | 'variant' | 'col' | 'row' | 'rot'>, b: Pick<Piece, 'category' | 'variant' | 'col' | 'row' | 'rot'>): boolean {
  const sa = shapeOf(a);
  const sb = shapeOf(b);
  if (sa === 'bar' && sb === 'bar') {
    const ea = edgeLine(a);
    const eb = edgeLine(b);
    return ea.axis === eb.axis && ea.at === eb.at && Math.min(ea.to, eb.to) > Math.max(ea.from, eb.from);
  }
  if (sa === 'post' && sb === 'post') {
    const [ax, az] = cornerPoint(a);
    const [bx, bz] = cornerPoint(b);
    return ax === bx && az === bz;
  }
  return false;
}

function overlaps(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

export function createWorld(resources: Resources, pieces: Omit<Piece, 'uid'>[] = []): World {
  return {
    resources: { ...resources },
    pieces: pieces.map((p, i) => ({ ...p, uid: i + 1 })),
    nextUid: pieces.length + 1,
  };
}

export interface Placement {
  col: number;
  row: number;
  rot: Rotation;
}

/**
 * Where a piece under the pointer goes. The pointer marks the bottom of the piece:
 * - on a foundation, walls and beams take the edge nearest the pointer and pillars the
 *   nearest corner, so the wall's base runs under the cursor (R is ignored for them);
 *   other pieces cover that foundation, turned by R.
 * - off a foundation, walls are centred on the pointer along the edge R picks, pillars
 *   put R's corner on it, and blocks are centred on it.
 */
export function snapPlacement(world: World, piece: Pick<Piece, 'category' | 'variant'>, x: number, y: number, rot: Rotation): Placement {
  const shape = shapeOf(piece);
  if (piece.category !== 'foundation') {
    const under = topFoundationAt(world, x, y);
    if (under) {
      const lx = x / CELL - under.col;
      const lz = y / CELL - under.row;
      let r = rot;
      if (shape === 'bar') {
        const edges: [number, Rotation][] = [[lz, 0], [2 - lx, 90], [2 - lz, 180], [lx, 270]];
        r = edges.reduce((best, e) => (e[0] < best[0] ? e : best))[1];
      } else if (shape === 'post') {
        const east = lx >= 1;
        const south = lz >= 1;
        r = south ? (east ? 180 : 270) : east ? 90 : 0;
      }
      return { col: under.col, row: under.row, rot: r };
    }
  }

  const gx = x / CELL;
  const gz = y / CELL;
  let col: number;
  let row: number;
  if (shape === 'bar') {
    // The block whose `rot` edge has its midpoint at the pointer.
    const at = { 0: [gx - 1, gz], 90: [gx - 2, gz - 1], 180: [gx - 1, gz - 2], 270: [gx, gz - 1] }[rot];
    col = Math.round(at[0]);
    row = Math.round(at[1]);
  } else if (shape === 'post') {
    const at = { 0: [gx, gz], 90: [gx - 2, gz], 180: [gx - 2, gz - 2], 270: [gx, gz - 2] }[rot];
    col = Math.round(at[0]);
    row = Math.round(at[1]);
  } else {
    col = Math.round(gx - 1);
    row = Math.round(gz - 1);
  }
  return {
    col: Math.min(Math.max(col, 0), Math.floor(STAGE.width / CELL) - 2),
    row: Math.min(Math.max(row, 0), Math.floor(STAGE.height / CELL) - 2),
    rot,
  };
}

function topFoundationAt(world: World, x: number, y: number): Piece | undefined {
  return world.pieces.find((p) => p.category === 'foundation' && contains(footprint(p), x, y));
}

function contains(r: Rect, x: number, y: number): boolean {
  return x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h;
}

export type PlaceCheck = { ok: true; cost: number } | { ok: false; reason: string };

export function canPlace(world: World, sel: CompleteSelection, col: number, row: number, rot: Rotation): PlaceCheck {
  const candidate = { category: sel.category.id, variant: sel.variant.id, col, row, rot };
  const rect = footprint(candidate);
  if (rect.x < 0 || rect.y < 0 || rect.x + rect.w > STAGE.width || rect.y + rect.h > STAGE.height) {
    return { ok: false, reason: 'Out of bounds' };
  }

  if (sel.category.id === 'foundation') {
    if (world.pieces.some((p) => p.category === 'foundation' && overlaps(footprint(p), rect))) {
      return { ok: false, reason: 'Blocked by a foundation' };
    }
  } else {
    if (!world.pieces.some((p) => p.category === 'foundation' && p.col === col && p.row === row)) {
      return { ok: false, reason: 'Needs a foundation' };
    }
    const sameLayer = LAYER[sel.category.id];
    const taken = world.pieces.some(
      (p) => p.category !== 'foundation' && LAYER[p.category] === sameLayer && (overlaps(footprint(p), rect) || sharesEdge(p, candidate)),
    );
    if (taken) return { ok: false, reason: 'Space taken' };
  }

  const { cost } = stats(sel.variant, sel.material);
  if (world.resources[sel.material.res] < cost) return { ok: false, reason: 'Not enough ' + sel.material.res };
  return { ok: true, cost };
}

export function place(world: World, sel: CompleteSelection, col: number, row: number, rot: Rotation): World {
  const check = canPlace(world, sel, col, row, rot);
  if (!check.ok) return world;
  const res = sel.material.res;
  return {
    resources: { ...world.resources, [res]: world.resources[res] - check.cost },
    pieces: [
      ...world.pieces,
      {
        uid: world.nextUid,
        category: sel.category.id,
        variant: sel.variant.id,
        material: sel.material.id,
        texture: sel.texture.id,
        col,
        row,
        rot,
      },
    ],
    nextUid: world.nextUid + 1,
  };
}

/** Topmost piece under a point, if any. */
export function pieceAt(world: World, x: number, y: number): Piece | undefined {
  return [...world.pieces]
    .sort((a, b) => LAYER[b.category] - LAYER[a.category] || b.uid - a.uid)
    .find((p) => contains(footprint(p), x, y));
}

/** Removes a piece and refunds part of its cost. A foundation takes everything standing on it down too. */
export function demolish(world: World, uid: number): World {
  const target = world.pieces.find((p) => p.uid === uid);
  if (!target) return world;
  const doomed = world.pieces.filter(
    (p) => p.uid === uid || (target.category === 'foundation' && p.category !== 'foundation' && p.col === target.col && p.row === target.row),
  );
  const resources = { ...world.resources };
  for (const p of doomed) {
    const sel = resolve([p.category, p.variant, p.material, p.texture]);
    if (sel.variant && sel.material) resources[sel.material.res] += Math.floor(stats(sel.variant, sel.material).cost * REFUND);
  }
  const gone = new Set(doomed.map((p) => p.uid));
  return { ...world, resources, pieces: world.pieces.filter((p) => !gone.has(p.uid)) };
}

export function textureBg(p: Pick<Piece, 'material' | 'texture'>): string {
  const material = MATERIALS.find((m) => m.id === p.material);
  return (material && TEXTURES[material.id].find((t) => t.id === p.texture)?.bg) ?? '#1B2328';
}
