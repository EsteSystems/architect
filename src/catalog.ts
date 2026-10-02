export type ResourceId = 'wood' | 'stone' | 'metal' | 'alloy';

export interface Texture {
  id: string;
  label: string;
  code: string;
  /** CSS `background` value used for the swatch, node fill and placed pieces. */
  bg: string;
}

export interface Material {
  id: MaterialId;
  label: string;
  code: string;
  tier: number;
  res: ResourceId;
  cost: number;
  hp: number;
  time: string;
}

export interface Variant {
  id: string;
  label: string;
  code: string;
  /** Scales the material's base cost and health. */
  mult: number;
  shape: Shape;
}

export interface Category {
  id: CategoryId;
  label: string;
  code: string;
  snap: string;
  children: Variant[];
}

export type MaterialId = 'twig' | 'wood' | 'stone' | 'metal' | 'armored';
export type CategoryId = 'foundation' | 'wall' | 'floor' | 'stairs' | 'roof' | 'support';
/** How a piece is drawn on the top-down plan. */
export type Shape = 'square' | 'triangle' | 'bar' | 'post';

export const RESOURCES: { id: ResourceId; label: string }[] = [
  { id: 'wood', label: 'Wood' },
  { id: 'stone', label: 'Stone' },
  { id: 'metal', label: 'Metal' },
  { id: 'alloy', label: 'Alloy' },
];

const T = (id: string, label: string, code: string, bg: string): Texture => ({ id, label, code, bg });

export const TEXTURES: Record<MaterialId, Texture[]> = {
  twig: [
    T('lashed', 'Lashed', 'LSH', 'repeating-linear-gradient(60deg, #8f7a52 0 3px, transparent 3px 9px), repeating-linear-gradient(-60deg, #7a6744 0 3px, transparent 3px 9px), #2b2a22'),
    T('bundled', 'Bundled', 'BND', 'repeating-linear-gradient(90deg, #8f7a52 0 3px, #5f5236 3px 6px)'),
  ],
  wood: [
    T('plank', 'Plank', 'PLK', 'repeating-linear-gradient(0deg, #7a5532 0 10px, #4a321c 10px 12px)'),
    T('log', 'Log', 'LOG', 'repeating-radial-gradient(circle at 50% 50%, #7a5532 0 4px, #5e3f24 4px 8px)'),
    T('shingle', 'Shingle', 'SHG', 'repeating-linear-gradient(0deg, #3a2716 0 2px, transparent 2px 12px), repeating-linear-gradient(90deg, #6b4a2b 0 14px, #4a321c 14px 16px)'),
    T('weathered', 'Weathered', 'WTH', 'repeating-linear-gradient(0deg, #6d6459 0 9px, #4b4540 9px 11px)'),
  ],
  stone: [
    T('roughcut', 'Rough Cut', 'RGH', 'linear-gradient(#55554f 2px, transparent 2px) 0 0 / 100% 16px, linear-gradient(90deg, #55554f 2px, transparent 2px) 0 0 / 26px 100%, #858580'),
    T('brick', 'Brick', 'BRK', 'linear-gradient(#3d2a24 2px, transparent 2px) 0 0 / 100% 10px, linear-gradient(90deg, #3d2a24 2px, transparent 2px) 0 0 / 20px 20px, linear-gradient(90deg, #3d2a24 2px, transparent 2px) 10px 10px / 20px 20px, #8c4a36'),
    T('cobble', 'Cobble', 'CBL', 'repeating-radial-gradient(circle at 30% 30%, #7c7a72 0 6px, #55534d 6px 8px)'),
    T('slate', 'Slate', 'SLT', 'repeating-linear-gradient(170deg, #3f4850 0 6px, #56616b 6px 9px)'),
  ],
  metal: [
    T('corrugated', 'Corrugated', 'CRG', 'repeating-linear-gradient(90deg, #8e979c 0 4px, #5f676b 4px 8px)'),
    T('riveted', 'Riveted', 'RVT', 'radial-gradient(circle, #3a4146 0 2px, transparent 2.5px) 0 0 / 12px 12px, #7b858a'),
    T('panel', 'Panel', 'PNL', 'linear-gradient(#4a5256 2px, transparent 2px) 0 0 / 100% 20px, linear-gradient(90deg, #4a5256 2px, transparent 2px) 0 0 / 20px 100%, #6e787d'),
    T('rusted', 'Rusted', 'RST', 'radial-gradient(circle at 30% 40%, #a35a2f 0 6px, transparent 9px), radial-gradient(circle at 70% 70%, #8f4d28 0 5px, transparent 8px), repeating-linear-gradient(90deg, #7b5040 0 4px, #5b3a2e 4px 8px)'),
  ],
  armored: [
    T('plated', 'Plated', 'PLT', 'linear-gradient(#2c3236 2px, transparent 2px) 0 0 / 100% 16px, linear-gradient(90deg, #2c3236 2px, transparent 2px) 0 0 / 24px 100%, #51595e'),
    T('hex', 'Hex Mesh', 'HEX', 'radial-gradient(circle, #2c3236 0 3px, transparent 3.5px) 0 0 / 10px 10px, radial-gradient(circle, #2c3236 0 3px, transparent 3.5px) 5px 5px / 10px 10px, #5d666b'),
    T('industrial', 'Industrial', 'IND', 'repeating-linear-gradient(45deg, #2f363a 0 6px, #4f585d 6px 12px)'),
  ],
};

export const MATERIALS: Material[] = [
  { id: 'twig', label: 'Twig', code: 'TWG', tier: 1, res: 'wood', cost: 15, hp: 15, time: 'Instant' },
  { id: 'wood', label: 'Wood', code: 'WOD', tier: 2, res: 'wood', cost: 120, hp: 240, time: '4s' },
  { id: 'stone', label: 'Stone', code: 'STN', tier: 3, res: 'stone', cost: 180, hp: 480, time: '7s' },
  { id: 'metal', label: 'Sheet Metal', code: 'MTL', tier: 4, res: 'metal', cost: 140, hp: 960, time: '10s' },
  { id: 'armored', label: 'Armored', code: 'ARM', tier: 5, res: 'alloy', cost: 20, hp: 1900, time: '16s' },
];

const P = (id: string, label: string, code: string, mult: number, shape: Shape): Variant => ({ id, label, code, mult, shape });

export const CATEGORIES: Category[] = [
  { id: 'foundation', label: 'Foundation', code: 'FND', snap: 'Ground, other foundations', children: [
    P('fsquare', 'Square', 'SQR', 1, 'square'), P('ftri', 'Triangle', 'TRI', 0.5, 'triangle'), P('fsteps', 'Steps', 'STP', 0.5, 'square'),
  ] },
  { id: 'wall', label: 'Wall', code: 'WAL', snap: 'Foundation and floor edges', children: [
    P('wfull', 'Full Wall', 'FUL', 1, 'bar'), P('whalf', 'Half Wall', 'HLF', 0.5, 'bar'), P('wlow', 'Low Wall', 'LOW', 0.35, 'bar'),
    P('doorway', 'Doorway', 'DWY', 0.7, 'bar'), P('window', 'Window', 'WIN', 0.7, 'bar'), P('wframe', 'Wall Frame', 'FRM', 0.5, 'bar'),
  ] },
  { id: 'floor', label: 'Floor', code: 'FLR', snap: 'Top of walls', children: [
    P('flsq', 'Square Floor', 'SQR', 0.5, 'square'), P('fltri', 'Triangle Floor', 'TRI', 0.25, 'triangle'),
    P('flframe', 'Floor Frame', 'FRM', 0.35, 'square'), P('flhatch', 'Hatch Frame', 'HCH', 0.35, 'square'),
  ] },
  { id: 'stairs', label: 'Stairs', code: 'STR', snap: 'Square foundations and floors', children: [
    P('su', 'U-Shaped', 'U', 1, 'square'), P('sl', 'L-Shaped', 'L', 1, 'square'), P('sspiral', 'Spiral', 'SPR', 1, 'square'),
  ] },
  { id: 'roof', label: 'Roof', code: 'ROF', snap: 'Top of walls', children: [
    P('rflat', 'Flat Roof', 'FLT', 1, 'square'), P('rpitch', 'Pitched Roof', 'PCH', 1, 'square'), P('rtri', 'Triangle Roof', 'TRI', 0.5, 'triangle'),
  ] },
  { id: 'support', label: 'Support', code: 'SUP', snap: 'Foundation corners, wall tops', children: [
    P('pillar', 'Pillar', 'PIL', 0.25, 'post'), P('beam', 'Beam', 'BEM', 0.35, 'bar'),
  ] },
];
