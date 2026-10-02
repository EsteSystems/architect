import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { cycleMaterial, cycleTexture, isComplete, pick, resolve, back as menuBack, type MenuPath } from '../selection';
import {
  BLOCK,
  LAYER,
  canPlace,
  demolish,
  footprint,
  pieceAt,
  place,
  snapAnchor,
  type Rotation,
  type World,
} from '../world';
import { Breadcrumbs, RadialMenu } from './RadialMenu';
import { LeafPanel } from './LeafPanel';
import { KeyLegend, ResourceBar } from './Hud';
import { Ghost, PlacedPiece } from './Plan';

export interface BuildingPlanProps {
  initialWorld: World;
  initialPath?: MenuPath;
  accent?: string;
  showLabels?: boolean;
  /** Stage scale; the stage is a fixed 1440×900 artboard. */
  scale?: number;
}

type Point = { x: number; y: number };

export function BuildingPlan({ initialWorld, initialPath = [], accent = '#F2A33A', showLabels = true, scale = 1 }: BuildingPlanProps) {
  const [world, setWorld] = useState(initialWorld);
  const [path, setPath] = useState<string[]>([...initialPath]);
  const [open, setOpen] = useState(true);
  const [rot, setRot] = useState<Rotation>(0);
  const [pointer, setPointer] = useState<Point | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  // Read by the key handler, which must see the latest pointer even before a re-render.
  const pointerRef = useRef<Point | null>(null);

  const sel = resolve(path);
  const complete = isComplete(sel) ? sel : null;
  const placing = !open && complete !== null;

  const anchor = placing && pointer ? snapAnchor(world, complete.category.id, pointer.x, pointer.y) : null;
  const check = anchor && complete ? canPlace(world, complete, anchor.col, anchor.row, rot) : null;
  const hovered = !open && !placing && pointer ? pieceAt(world, pointer.x, pointer.y) : undefined;

  const toStage = useCallback(
    (clientX: number, clientY: number): Point | null => {
      const r = stageRef.current?.getBoundingClientRect();
      if (!r) return null;
      return { x: (clientX - r.left) / scale, y: (clientY - r.top) / scale };
    },
    [scale],
  );

  const goBack = useCallback(() => {
    if (path.length) setPath(menuBack(path));
    else setOpen(false);
  }, [path]);

  const placeAt = useCallback(
    (pt: Point) => {
      if (!complete) return;
      const a = snapAnchor(world, complete.category.id, pt.x, pt.y);
      setWorld((w) => place(w, complete, a.col, a.row, rot));
    },
    [complete, world, rot],
  );

  // Keyboard: ESC up one level, R rotate, T texture, X demolish.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const key = e.key.toLowerCase();
      if (key === 'escape') {
        e.preventDefault();
        if (placing) setOpen(true);
        else if (open) goBack();
      } else if (key === 'r') {
        setRot((r) => ((r + 90) % 360) as Rotation);
      } else if (key === 't') {
        setPath((p) => cycleTexture(p, e.shiftKey ? -1 : 1));
      } else if (key === 'x' && !open) {
        const pt = pointerRef.current;
        if (!pt) return;
        setWorld((w) => {
          const target = pieceAt(w, pt.x, pt.y);
          return target ? demolish(w, target.uid) : w;
        });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [placing, open, goBack]);

  // Wheel cycles material. Non-passive so the page doesn't scroll.
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (e.deltaY === 0) return;
      e.preventDefault();
      setPath((p) => cycleMaterial(p, e.deltaY > 0 ? 1 : -1));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  const onPointerDown = (e: ReactPointerEvent) => {
    if (e.button === 2) {
      setOpen(true);
      return;
    }
    // Pieces and the ghost ignore pointer events, so a hit on the stage itself is a hit on the build area.
    if (e.button === 0 && placing && e.target === stageRef.current) {
      const pt = toStage(e.clientX, e.clientY);
      if (pt) placeAt(pt);
    }
  };

  const sorted = [...world.pieces].sort((a, b) => LAYER[a.category] - LAYER[b.category] || a.uid - b.uid);
  const foundations = world.pieces.filter((p) => p.category === 'foundation').length;
  const shortOf = check && !check.ok && complete && check.reason.startsWith('Not enough') ? complete.material.res : undefined;

  return (
    <div
      ref={stageRef}
      className={'stage' + (placing ? ' placing' : '')}
      style={{ ['--accent' as string]: accent, transform: scale === 1 ? undefined : `scale(${scale})` }}
      onPointerDown={onPointerDown}
      onPointerMove={(e) => {
        pointerRef.current = toStage(e.clientX, e.clientY);
        setPointer(pointerRef.current);
      }}
      onPointerLeave={() => {
        pointerRef.current = null;
        setPointer(null);
      }}
      onContextMenu={(e) => e.preventDefault()}
      data-testid="stage"
    >
      {sorted.map((p) => (
        <PlacedPiece key={p.uid} piece={p} doomed={hovered?.uid === p.uid} />
      ))}

      {placing && anchor && check && (
        <Ghost
          rect={footprint({ category: complete.category.id, variant: complete.variant.id, col: anchor.col, row: anchor.row, rot })}
          bg={complete.texture.bg}
          triangle={complete.variant.shape === 'triangle'}
          reason={check.ok ? undefined : check.reason}
        />
      )}

      {open && complete && (
        <>
          <Ghost
            rect={{ x: 1220, y: 740, w: BLOCK, h: BLOCK }}
            bg={complete.texture.bg}
            triangle={complete.variant.shape === 'triangle'}
          />
          <span className="preview-label">GHOST PLACEMENT</span>
        </>
      )}

      <ResourceBar resources={world.resources} short={shortOf} />

      {open && (
        <RadialMenu
          path={path}
          accent={accent}
          showLabels={showLabels}
          onPick={(depth, id) => setPath((p) => pick(p, depth, id))}
          onBack={goBack}
        />
      )}

      <Breadcrumbs path={path} />

      {!open && !complete && (
        <button
          type="button"
          className="open-plan"
          onClick={() => {
            setPath([]);
            setOpen(true);
          }}
        >
          BUILDING PLAN
        </button>
      )}

      {open && complete && <LeafPanel sel={complete} resources={world.resources} onPlace={() => setOpen(false)} />}

      <KeyLegend foundations={foundations} pieces={world.pieces.length} />
    </div>
  );
}
