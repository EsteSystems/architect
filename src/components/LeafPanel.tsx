import { stats, type CompleteSelection } from '../selection';
import type { Resources } from '../world';
import { Pips } from './Pips';

interface Props {
  sel: CompleteSelection;
  resources: Resources;
  onPlace: () => void;
}

export function LeafPanel({ sel, resources, onPlace }: Props) {
  const { category, variant, material, texture } = sel;
  const { cost, hp } = stats(variant, material);
  const short = resources[material.res] < cost;
  const resLabel = material.res[0].toUpperCase() + material.res.slice(1);

  return (
    <aside className="panel" aria-label="Selected piece">
      <div className="panel-head">
        <span className="eyebrow">{category.label.toUpperCase()}</span>
        <span className="panel-title">{variant.label}</span>
      </div>
      <div className="field material-row">
        <div className="stack">
          <span className="micro">MATERIAL</span>
          <span className="material-name">{material.label}</span>
        </div>
        <div className="tier">
          <span className="micro">TIER {material.tier} / 5</span>
          <Pips className="tier-pips" tier={material.tier} on="var(--accent)" off="var(--line-2)" />
        </div>
      </div>
      <div className="field texture-field">
        <div className="texture-head">
          <span className="micro">TEXTURE</span>
          <span className="texture-note">COSMETIC · NO STAT CHANGE</span>
        </div>
        <div className="swatch" style={{ background: texture.bg }} />
        <span className="texture-name">{texture.label}</span>
      </div>
      <div className="stat-grid">
        <div className="field stat stack">
          <span className="micro">COST</span>
          <span className={'stat-value' + (short ? ' short' : '')}>{cost} {resLabel}</span>
        </div>
        <div className="field stat stack">
          <span className="micro">HEALTH</span>
          <span className="stat-value">{hp}</span>
        </div>
        <div className="field stat stack">
          <span className="micro">BUILD TIME</span>
          <span className="stat-value">{material.time}</span>
        </div>
        <div className="field stat stack">
          <span className="micro">SNAPS TO</span>
          <span className="stat-text">{category.snap}</span>
        </div>
      </div>
      <button type="button" className="place" onClick={onPlace}>
        {'PLACE  ·  LMB'}
      </button>
      <span className="hint">R to rotate · Material and texture stay picked</span>
    </aside>
  );
}
