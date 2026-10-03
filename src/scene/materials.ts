import { CanvasTexture, Color, MeshStandardMaterial, RepeatWrapping, SRGBColorSpace, type Texture } from 'three';
import { FALLBACK_COLOR, PAINTERS, TILE } from './painters';

const cache = new Map<string, Texture | null>();

function textureFor(id: string): Texture | null {
  if (cache.has(id)) return cache.get(id)!;
  let tex: Texture | null = null;
  const painter = PAINTERS[id];
  const canvas = typeof document !== 'undefined' ? document.createElement('canvas') : null;
  let ctx: CanvasRenderingContext2D | null = null;
  try {
    ctx = canvas?.getContext('2d') ?? null;
  } catch {
    ctx = null;
  }
  if (canvas && ctx && painter) {
    const scale = 2;
    canvas.width = canvas.height = TILE * scale;
    ctx.scale(scale, scale);
    painter(ctx);
    tex = new CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = RepeatWrapping;
    tex.colorSpace = SRGBColorSpace;
    tex.anisotropy = 4;
  }
  cache.set(id, tex);
  return tex;
}

export function pieceMaterial(textureId: string): MeshStandardMaterial {
  const map = textureFor(textureId);
  return new MeshStandardMaterial({
    map,
    color: map ? 0xffffff : new Color(FALLBACK_COLOR[textureId] ?? '#6f7d85'),
    roughness: 0.85,
    metalness: 0.05,
  });
}
