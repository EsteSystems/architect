import { MENU_DEPTH, levelItems, resolve, type MenuPath } from './selection';
import type { Material, Texture } from './catalog';

export const CENTER = { x: 680, y: 450 };
export const NODE_SIZE = 64;
const RADII = [110, 200, 290, 380];
/** Angular spacing (deg) between siblings fanned out from their parent; depth 0 is a full circle. */
const FAN_STEP = [0, 25, 19, 15];
export const STEP_NAMES = ['PIECE TYPE', 'VARIANT', 'MATERIAL', 'TEXTURE'];

export interface RadialNode {
  id: string;
  depth: number;
  label: string;
  code: string;
  x: number;
  y: number;
  onPath: boolean;
  /** Another choice at this depth is on the path. */
  dimmed: boolean;
  /** Present for material nodes. */
  tier?: number;
  /** Present for texture nodes. */
  textureBg?: string;
}

export interface RadialLink {
  x: number;
  y: number;
  length: number;
  angle: number;
  onPath: boolean;
  dimmed: boolean;
}

export interface RadialLayout {
  rings: { depth: number; radius: number }[];
  nodes: RadialNode[];
  links: RadialLink[];
}

/** Lays the menu out as concentric rings, each level fanned around the chosen parent. */
export function layoutRadial(path: MenuPath): RadialLayout {
  const rings: RadialLayout['rings'] = [];
  const nodes: RadialNode[] = [];
  const links: RadialLink[] = [];
  let parentAng = -90;
  let px = CENTER.x;
  let py = CENTER.y;

  for (let d = 0; d < MENU_DEPTH; d++) {
    const items = levelItems(path, d);
    if (!items) break;
    const n = items.length;
    const r = RADII[d];
    rings.push({ depth: d, radius: r });
    let next: { ang: number; x: number; y: number } | null = null;

    items.forEach((item, i) => {
      const ang = d === 0 ? -90 + i * (360 / n) : parentAng + (i - (n - 1) / 2) * FAN_STEP[d];
      const rad = (ang * Math.PI) / 180;
      const x = CENTER.x + r * Math.cos(rad);
      const y = CENTER.y + r * Math.sin(rad);
      const onPath = path[d] === item.id;
      const dimmed = path.length > d && !onPath;
      nodes.push({
        id: item.id,
        depth: d,
        label: item.label,
        code: item.code,
        x,
        y,
        onPath,
        dimmed,
        tier: d === 2 ? (item as Material).tier : undefined,
        textureBg: d === 3 ? (item as Texture).bg : undefined,
      });
      if (d > 0 || onPath) {
        const dx = x - px;
        const dy = y - py;
        links.push({
          x: px,
          y: py,
          length: Math.hypot(dx, dy),
          angle: (Math.atan2(dy, dx) * 180) / Math.PI,
          onPath,
          dimmed,
        });
      }
      if (onPath) next = { ang, x, y };
    });

    if (!next) break;
    ({ ang: parentAng, x: px, y: py } = next);
  }
  return { rings, nodes, links };
}

export function breadcrumbs(path: MenuPath): string {
  const sel = resolve(path);
  const parts = ['BUILD', sel.category?.label, sel.variant?.label, sel.material?.label, sel.texture?.label];
  return parts
    .filter((p): p is string => !!p)
    .map((p) => p.toUpperCase())
    .join('  ›  ');
}

export function hubText(path: MenuPath): { step: string; title: string } {
  const { category, variant, material, texture } = resolve(path);
  const depth = [category, variant, material, texture].filter(Boolean).length;
  const step = texture ? 'READY' : `${Math.min(depth, 3) + 1}/4 · ${STEP_NAMES[Math.min(depth, 3)]}`;
  const title = material && variant ? `${material.label} ${variant.label}` : variant?.label ?? category?.label ?? 'Pick a piece';
  return { step, title };
}
