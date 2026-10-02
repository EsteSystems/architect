import { describe, expect, it } from 'vitest';
import { breadcrumbs, hubText, layoutRadial } from './radial';

describe('radial layout', () => {
  it('places the six piece types on the inner ring, starting at the top', () => {
    const { nodes, rings } = layoutRadial([]);
    expect(rings).toHaveLength(1);
    expect(nodes).toHaveLength(6);
    expect(nodes[0]).toMatchObject({ id: 'foundation', x: 680, y: 340 });
  });

  it('fans each level around the chosen parent', () => {
    const { nodes, rings, links } = layoutRadial(['wall', 'doorway', 'stone', 'brick']);
    expect(rings.map((r) => r.radius)).toEqual([110, 200, 290, 380]);
    expect(nodes).toHaveLength(6 + 6 + 5 + 4);
    // Every node past the first ring gets a link, plus the one on-path link from the hub.
    expect(links).toHaveLength(1 + 6 + 5 + 4);
    const onPath = nodes.filter((n) => n.onPath).map((n) => n.id);
    expect(onPath).toEqual(['wall', 'doorway', 'stone', 'brick']);
    expect(nodes.filter((n) => n.depth === 0 && n.dimmed)).toHaveLength(5);
  });

  it('describes the current step in the hub and crumbs', () => {
    expect(hubText([])).toEqual({ step: '1/4 · PIECE TYPE', title: 'Pick a piece' });
    expect(hubText(['wall', 'doorway', 'stone'])).toEqual({ step: '4/4 · TEXTURE', title: 'Stone Doorway' });
    expect(hubText(['wall', 'doorway', 'stone', 'brick']).step).toBe('READY');
    expect(breadcrumbs(['wall', 'doorway'])).toBe('BUILD  ›  WALL  ›  DOORWAY');
  });
});
