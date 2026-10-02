import { resolve } from '../selection';
import { footprint, shapeOf, textureBg, type Piece, type Rect } from '../world';

const CODE_SHAPES = new Set(['square', 'triangle']);

export function PlacedPiece({ piece, doomed }: { piece: Piece; doomed: boolean }) {
  const r = footprint(piece);
  const shape = shapeOf(piece);
  return (
    <div
      className={['piece', piece.category, shape, doomed && 'doomed'].filter(Boolean).join(' ')}
      style={{ left: r.x, top: r.y, width: r.w, height: r.h, background: textureBg(piece) }}
      data-testid="piece"
    >
      {CODE_SHAPES.has(shape) && piece.category !== 'foundation' && (
        <span className="piece-code">{resolve([piece.category, piece.variant]).variant?.code}</span>
      )}
    </div>
  );
}

interface GhostProps {
  rect: Rect;
  bg: string;
  triangle: boolean;
  reason?: string;
}

export function Ghost({ rect, bg, triangle, reason }: GhostProps) {
  return (
    <>
      <div
        className={'ghost' + (reason ? ' invalid' : '')}
        style={{
          left: rect.x,
          top: rect.y,
          width: rect.w,
          height: rect.h,
          background: bg,
          clipPath: triangle ? 'polygon(0 100%, 50% 0, 100% 100%)' : undefined,
        }}
      />
      {reason && (
        <span className="ghost-reason" style={{ left: rect.x + rect.w / 2, top: rect.y + rect.h + 6 }}>
          {reason}
        </span>
      )}
    </>
  );
}
