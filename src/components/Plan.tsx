import type { Rect } from '../world';

interface GhostProps {
  rect: Rect;
  bg: string;
  triangle: boolean;
}

/** The flat "ghost placement" swatch shown beside the menu. */
export function Ghost({ rect, bg, triangle }: GhostProps) {
  return (
    <div
      className="ghost"
      style={{
        left: rect.x,
        top: rect.y,
        width: rect.w,
        height: rect.h,
        background: bg,
        clipPath: triangle ? 'polygon(0 100%, 50% 0, 100% 100%)' : undefined,
      }}
    />
  );
}
