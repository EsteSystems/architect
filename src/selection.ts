import { CATEGORIES, MATERIALS, TEXTURES, type Category, type Material, type Texture, type Variant } from './catalog';

/** Path of ids through the menu: [category, variant, material, texture]. */
export type MenuPath = readonly string[];

export interface Selection {
  category?: Category;
  variant?: Variant;
  material?: Material;
  texture?: Texture;
}

export interface CompleteSelection {
  category: Category;
  variant: Variant;
  material: Material;
  texture: Texture;
}

export const MENU_DEPTH = 4;

/** Items offered at a given menu depth, given the choices made above it. */
export function levelItems(path: MenuPath, depth: number): (Category | Variant | Material | Texture)[] | null {
  const sel = resolve(path.slice(0, depth));
  switch (depth) {
    case 0: return CATEGORIES;
    case 1: return sel.category?.children ?? null;
    case 2: return sel.variant ? MATERIALS : null;
    case 3: return sel.material ? TEXTURES[sel.material.id] : null;
    default: return null;
  }
}

export function resolve(path: MenuPath): Selection {
  const category = CATEGORIES.find((c) => c.id === path[0]);
  const variant = category?.children.find((v) => v.id === path[1]);
  const material = variant ? MATERIALS.find((m) => m.id === path[2]) : undefined;
  const texture = material ? TEXTURES[material.id].find((t) => t.id === path[3]) : undefined;
  return { category, variant, material, texture };
}

export function isComplete(sel: Selection): sel is CompleteSelection {
  return !!(sel.category && sel.variant && sel.material && sel.texture);
}

/** Clicking a node: picks it, or un-picks it if it is already the deepest choice. */
export function pick(path: MenuPath, depth: number, id: string): string[] {
  const same = path[depth] === id && path.length === depth + 1;
  return same ? path.slice(0, depth) : [...path.slice(0, depth), id];
}

export function back(path: MenuPath): string[] {
  return path.slice(0, -1);
}

/**
 * Steps the material (wheel). Keeps the texture when the new material has one with the
 * same id, otherwise falls back to the material's first texture.
 */
export function cycleMaterial(path: MenuPath, dir: 1 | -1): string[] {
  const sel = resolve(path);
  if (!sel.variant) return [...path];
  const i = sel.material ? MATERIALS.indexOf(sel.material) : dir === 1 ? -1 : 0;
  const next = MATERIALS[(i + dir + MATERIALS.length) % MATERIALS.length];
  const textures = TEXTURES[next.id];
  const tex = textures.find((t) => t.id === path[3]) ?? textures[0];
  return [path[0], path[1], next.id, tex.id];
}

/** Steps the texture within the current material (T). */
export function cycleTexture(path: MenuPath, dir: 1 | -1 = 1): string[] {
  const sel = resolve(path);
  if (!sel.material) return [...path];
  const textures = TEXTURES[sel.material.id];
  const i = sel.texture ? textures.indexOf(sel.texture) : dir === 1 ? -1 : 0;
  const next = textures[(i + dir + textures.length) % textures.length];
  return [path[0], path[1], path[2], next.id];
}

export interface PieceStats {
  cost: number;
  hp: number;
}

export function stats(variant: Variant, material: Material): PieceStats {
  return {
    cost: Math.max(1, Math.round(material.cost * variant.mult)),
    hp: Math.max(5, Math.round(material.hp * Math.max(variant.mult, 0.5))),
  };
}
