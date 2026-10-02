import { breadcrumbs, hubText, layoutRadial, NODE_SIZE, CENTER } from '../radial';
import type { MenuPath } from '../selection';
import { Pips } from './Pips';

interface Props {
  path: MenuPath;
  accent: string;
  showLabels: boolean;
  onPick: (depth: number, id: string) => void;
  onBack: () => void;
}

export function RadialMenu({ path, accent, showLabels, onPick, onBack }: Props) {
  const { rings, nodes, links } = layoutRadial(path);
  const hub = hubText(path);

  return (
    <div className="radial" aria-label="Building plan menu">
      <div className="vignette" />
      {rings.map((r) => (
        <div
          key={r.depth}
          className="ring"
          style={{ left: CENTER.x - r.radius, top: CENTER.y - r.radius, width: r.radius * 2, height: r.radius * 2, opacity: r.depth === 0 ? 0.9 : 0.6 }}
        />
      ))}
      {links.map((l, i) => (
        <div
          key={i}
          className="link"
          style={{
            left: l.x,
            top: l.y - 1,
            width: l.length,
            transform: `rotate(${l.angle}deg)`,
            background: l.onPath ? accent : 'var(--line-2)',
            opacity: l.dimmed ? 0.5 : 1,
          }}
        />
      ))}
      {nodes.map((n) => {
        const isMaterial = n.tier !== undefined;
        const isTexture = n.textureBg !== undefined;
        const cls = ['node', n.onPath && 'on-path', n.dimmed && 'dimmed', isMaterial && 'material', isTexture && 'texture']
          .filter(Boolean)
          .join(' ');
        return (
          <button
            key={`${n.depth}:${n.id}`}
            type="button"
            className={cls}
            aria-label={n.label}
            aria-pressed={n.onPath}
            onClick={() => onPick(n.depth, n.id)}
            style={{ left: n.x - NODE_SIZE / 2, top: n.y - NODE_SIZE / 2, background: n.textureBg }}
          >
            <span className={isTexture ? 'node-code-tex' : undefined}>{n.code}</span>
            {n.depth < 3 && <span className="node-dot" />}
            {isMaterial && (
              <Pips
                className="node-pips"
                tier={n.tier!}
                on={n.onPath ? 'var(--ink)' : accent}
                off={n.onPath ? 'rgba(20,24,27,0.3)' : 'var(--line-2)'}
              />
            )}
            {showLabels && <span className="node-label">{n.label}</span>}
          </button>
        );
      })}
      <div className="hub">
        <span className="hub-step">{hub.step}</span>
        <span className="hub-title">{hub.title}</span>
        <button type="button" className="hub-back" onClick={onBack}>
          {path.length ? '◂ BACK' : 'CLOSE'}
        </button>
      </div>
    </div>
  );
}

export function Breadcrumbs({ path }: { path: MenuPath }) {
  return <div className="crumbs">{breadcrumbs(path)}</div>;
}
