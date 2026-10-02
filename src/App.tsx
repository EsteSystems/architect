import { useEffect, useState } from 'react';
import { BuildingPlan } from './components/BuildingPlan';
import { createWorld, STAGE, type Piece } from './world';

const START_RESOURCES = { wood: 3420, stone: 1980, metal: 640, alloy: 42 };

/** A 3×2 pad of stone foundations to build on. */
const STARTER_PAD: Omit<Piece, 'uid'>[] = [0, 1].flatMap((r) =>
  [0, 1, 2].map((c) => ({
    category: 'foundation' as const,
    variant: 'fsquare',
    material: 'stone',
    texture: 'roughcut',
    col: 1 + c * 2,
    row: 11 + r * 2,
    rot: 0 as const,
  })),
);

function useFitScale(): number {
  const compute = () => Math.min(window.innerWidth / STAGE.width, window.innerHeight / STAGE.height);
  const [scale, setScale] = useState(compute);
  useEffect(() => {
    const onResize = () => setScale(compute());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return scale;
}

export function App() {
  const scale = useFitScale();
  const params = new URLSearchParams(window.location.search);
  return (
    <div className="viewport">
      <BuildingPlan
        initialWorld={createWorld(START_RESOURCES, STARTER_PAD)}
        initialPath={['wall', 'doorway', 'stone', 'brick']}
        accent={params.get('accent') ?? '#F2A33A'}
        showLabels={params.get('labels') !== 'off'}
        scale={scale}
      />
    </div>
  );
}
