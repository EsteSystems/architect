/**
 * Canvas painters for the 3D materials. Each mirrors the CSS swatch in catalog.ts,
 * drawn on a 96px tile (one 2×2-cell block) and adjusted so the pattern tiles seamlessly.
 */
export const TILE = 96;

type Ctx = CanvasRenderingContext2D;
type Stop = [color: string | null, len: number];

function fill(ctx: Ctx, color: string) {
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, TILE, TILE);
}

/** Repeating bands. `angle` follows CSS: 0 = horizontal bands, 90 = vertical bands. A null colour is transparent. */
function stripes(ctx: Ctx, angle: number, stops: Stop[]) {
  const period = stops.reduce((s, [, l]) => s + l, 0);
  ctx.save();
  ctx.translate(TILE / 2, TILE / 2);
  ctx.rotate((angle * Math.PI) / 180);
  const reach = TILE;
  for (let t = -reach - (reach % period); t < reach; t += period) {
    let o = t;
    for (const [color, len] of stops) {
      if (color) {
        ctx.fillStyle = color;
        ctx.fillRect(-reach, o, reach * 2, len);
      }
      o += len;
    }
  }
  ctx.restore();
}

function hlines(ctx: Ctx, color: string, thickness: number, every: number, offset = 0) {
  ctx.fillStyle = color;
  for (let y = offset; y < TILE; y += every) ctx.fillRect(0, y, TILE, thickness);
}

function vlines(ctx: Ctx, color: string, thickness: number, every: number, offset = 0) {
  ctx.fillStyle = color;
  for (let x = offset; x < TILE; x += every) ctx.fillRect(x, 0, thickness, TILE);
}

function bricks(ctx: Ctx, mortar: string, rowH: number, brickW: number) {
  hlines(ctx, mortar, 2, rowH);
  ctx.fillStyle = mortar;
  for (let row = 0; row * rowH < TILE; row++) {
    const off = row % 2 ? brickW / 2 : 0;
    for (let x = off; x < TILE; x += brickW) ctx.fillRect(x, row * rowH, 2, rowH);
  }
}

function dots(ctx: Ctx, color: string, r: number, every: number, offset: number) {
  ctx.fillStyle = color;
  for (let y = offset - every; y < TILE + every; y += every) {
    for (let x = offset - every; x < TILE + every; x += every) {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

/** Concentric rings around (cx, cy), like repeating-radial-gradient. */
function rings(ctx: Ctx, cx: number, cy: number, stops: Stop[]) {
  const period = stops.reduce((s, [, l]) => s + l, 0);
  const max = Math.ceil((TILE * 1.5) / period) * period;
  for (let r = max; r > 0; r -= period) {
    let o = r;
    for (const [color, len] of [...stops].reverse()) {
      if (color && o > 0) {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(cx, cy, o, 0, Math.PI * 2);
        ctx.fill();
      }
      o -= len;
    }
  }
}

function blob(ctx: Ctx, color: string, cx: number, cy: number, r: number) {
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 1.5);
  g.addColorStop(0, color);
  g.addColorStop(0.66, color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, TILE, TILE);
}

export const PAINTERS: Record<string, (ctx: Ctx) => void> = {
  lashed: (c) => {
    fill(c, '#2b2a22');
    stripes(c, 60, [['#8f7a52', 3], [null, 9]]);
    stripes(c, -60, [['#7a6744', 3], [null, 9]]);
  },
  bundled: (c) => stripes(c, 90, [['#8f7a52', 3], ['#5f5236', 3]]),
  plank: (c) => stripes(c, 0, [['#7a5532', 10], ['#4a321c', 2]]),
  log: (c) => rings(c, 48, 48, [['#7a5532', 4], ['#5e3f24', 4]]),
  shingle: (c) => {
    stripes(c, 90, [['#6b4a2b', 14], ['#4a321c', 2]]);
    stripes(c, 0, [['#3a2716', 2], [null, 10]]);
  },
  weathered: (c) => stripes(c, 0, [['#6d6459', 10], ['#4b4540', 2]]),
  roughcut: (c) => {
    fill(c, '#858580');
    hlines(c, '#55554f', 2, 16);
    vlines(c, '#55554f', 2, 24);
  },
  brick: (c) => {
    fill(c, '#8c4a36');
    bricks(c, '#3d2a24', 12, 24);
  },
  cobble: (c) => rings(c, 29, 29, [['#7c7a72', 6], ['#55534d', 2]]),
  slate: (c) => stripes(c, 170, [['#3f4850', 6], ['#56616b', 3]]),
  corrugated: (c) => stripes(c, 90, [['#8e979c', 4], ['#5f676b', 4]]),
  riveted: (c) => {
    fill(c, '#7b858a');
    dots(c, '#3a4146', 2.2, 12, 6);
  },
  panel: (c) => {
    fill(c, '#6e787d');
    hlines(c, '#4a5256', 2, 24);
    vlines(c, '#4a5256', 2, 48);
  },
  rusted: (c) => {
    stripes(c, 90, [['#7b5040', 4], ['#5b3a2e', 4]]);
    blob(c, '#a35a2f', 29, 38, 7.5);
    blob(c, '#8f4d28', 67, 67, 6.5);
  },
  plated: (c) => {
    fill(c, '#51595e');
    hlines(c, '#2c3236', 2, 16);
    vlines(c, '#2c3236', 2, 24);
  },
  hex: (c) => {
    fill(c, '#5d666b');
    dots(c, '#2c3236', 3.2, 12, 6);
    dots(c, '#2c3236', 3.2, 12, 0);
  },
  industrial: (c) => stripes(c, 45, [['#2f363a', 6], ['#4f585d', 6]]),
};

/** Flat colour used when a canvas is unavailable (e.g. tests). */
export const FALLBACK_COLOR: Record<string, string> = {
  lashed: '#5f5236', bundled: '#7a6744', plank: '#6a4a2c', log: '#6c4a2c', shingle: '#5a3e24', weathered: '#5e564d',
  roughcut: '#7a7a74', brick: '#7f4432', cobble: '#6c6a63', slate: '#4a545d', corrugated: '#777f84', riveted: '#727c81',
  panel: '#677176', rusted: '#6d4637', plated: '#4a5257', hex: '#535b60', industrial: '#3f474b',
};
