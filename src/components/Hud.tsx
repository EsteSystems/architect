import { RESOURCES } from '../catalog';
import type { ResourceId } from '../catalog';
import type { Resources } from '../world';

const fmt = new Intl.NumberFormat('en-US');

export function ResourceBar({ resources, short }: { resources: Resources; short?: ResourceId }) {
  return (
    <div className="resources">
      {RESOURCES.map((r) => (
        <div key={r.id} className={'resource' + (short === r.id ? ' short' : '')}>
          <span className="resource-label">{r.label}</span>
          <span className="resource-value">{fmt.format(resources[r.id])}</span>
        </div>
      ))}
    </div>
  );
}

const KEYS: [string, string][] = [
  ['RMB', 'Hold to open'],
  ['ESC', 'Up one level'],
  ['WHEEL', 'Cycle material'],
  ['T', 'Cycle texture'],
  ['X', 'Demolish'],
  ['WASD', 'Move view'],
  ['Q / E', 'Turn view'],
  ['MMB', 'Orbit'],
  ['SHIFT+WHEEL', 'Zoom'],
];

export function KeyLegend() {
  return (
    <div className="legend">
      {KEYS.map(([key, label]) => (
        <span key={key} className="legend-item">
          <span className="key">{key}</span>
          {label}
        </span>
      ))}
    </div>
  );
}

export function PieceCounts({ foundations, pieces }: { foundations: number; pieces: number }) {
  return (
    <div className="counts">
      FOUNDATIONS · {foundations} &nbsp; PIECES · {pieces}
    </div>
  );
}
