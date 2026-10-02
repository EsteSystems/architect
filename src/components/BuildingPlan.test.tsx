import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { BuildingPlan } from './BuildingPlan';
import { createWorld } from '../world';

afterEach(cleanup);

const world = () =>
  createWorld({ wood: 3420, stone: 1980, metal: 640, alloy: 42 }, [
    { category: 'foundation', variant: 'fsquare', material: 'stone', texture: 'roughcut', col: 2, row: 2, rot: 0 },
  ]);

describe('BuildingPlan', () => {
  it('walks the menu down to a placeable piece', () => {
    render(<BuildingPlan initialWorld={world()} />);
    expect(screen.getByText('Pick a piece')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Wall' }));
    fireEvent.click(screen.getByRole('button', { name: 'Doorway' }));
    fireEvent.click(screen.getByRole('button', { name: 'Stone' }));
    fireEvent.click(screen.getByRole('button', { name: 'Brick' }));
    expect(screen.getByText('READY')).toBeTruthy();
    expect(screen.getByText('126 Stone')).toBeTruthy();
    expect(screen.getByText('336')).toBeTruthy();
  });

  it('backs out with ESC and closes at the top', () => {
    render(<BuildingPlan initialWorld={world()} initialPath={['wall', 'doorway']} />);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.getByRole('button', { name: 'Wall' }).getAttribute('aria-pressed')).toBe('true');
    fireEvent.keyDown(window, { key: 'Escape' });
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.getByRole('button', { name: 'BUILDING PLAN' })).toBeTruthy();
  });

  it('cycles texture with T', () => {
    render(<BuildingPlan initialWorld={world()} initialPath={['wall', 'doorway', 'stone', 'brick']} />);
    fireEvent.keyDown(window, { key: 't' });
    expect(screen.getByText('Cobble', { selector: '.texture-name' })).toBeTruthy();
  });
});
