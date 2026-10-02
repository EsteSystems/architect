import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { cycleMaterial, cycleTexture, isComplete, pick, resolve, back as menuBack, type MenuPath } from '../selection';
import { BLOCK, canPlace, demolish, place, snapAnchor, type Rotation, type World } from '../world';
import { FOUNDATION_H } from '../scene/geometry';
import { Scene3D, type Scene3DHandle, type ScenePick } from '../scene/Scene3D';
import { Breadcrumbs, RadialMenu } from './RadialMenu';
import { LeafPanel } from './LeafPanel';
import { KeyLegend, PieceCounts, ResourceBar } from './Hud';
import { Ghost } from './Plan';

export interface BuildingPlanProps {
  initialWorld: World;
  initialPath?: MenuPath;
  accent?: string;
  showLabels?: boolean;
  /** Stage scale; the stage is a fixed 1440×900 artboard. */
  scale?: number;
}


export function BuildingPlan({ initialWorld, initialPath = [], accent = '#F2A33A', showLabels = true, scale = 1 }: BuildingPlanProps) {
  const [world, setWorld] = useState(initialWorld);
  const [path, setPath] = useState<string[]>([...initialPath]);
  const [open, setOpen] = useState(true);
  const [rot, setRot] = useState<Rotation>(0);
  const [hit, setHit] = useState<ScenePick>({ plan: null });
  const stageRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<Scene3DHandle>(null);
  // Read by the key handler, which must see the latest hit even before a re-render.
  const hitRef = useRef<ScenePick>({ plan: null });

  const sel = resolve(path);
  const complete = isComplete(sel) ? sel : null;
  const placing = !open && complete !== null;
  // The last full material + texture picked, re-applied when another variant is chosen.
  const finishRef = useRef<[string, string] | undefined>(undefined);
  if (complete) finishRef.current = [complete.material.id, complete.texture.id];
  // Foundations are aimed at the ground; everything else at the top of the foundations.
  const planeHeight = complete?.category.id === 'foundation' ? 0 : FOUNDATION_H;

  const anchor = placing && hit.plan ? snapAnchor(world, complete.category.id, hit.plan.x, hit.plan.y) : null;
  const check = anchor && complete ? canPlace(world, complete, anchor.col, anchor.row, rot) : null;
  const hoveredUid = !open && !placing ? hit.uid : undefined;

  const pickAt = useCallback(
    (clientX: number, clientY: number): ScenePick => {
      const r = stageRef.current?.getBoundingClientRect();
      if (!r || !sceneRef.current) return { plan: null };
      return sceneRef.current.pick((clientX - r.left) / scale, (clientY - r.top) / scale, planeHeight);
    },
    [scale, planeHeight],
  );

  const goBack = useCallback(() => {
    if (path.length) setPath(menuBack(path));
    else setOpen(false);
  }, [path]);

  // Keyboard: ESC up one level, R rotate, T texture, X demolish. Q/E turn the view (Scene3D).
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
        const uid = hitRef.current.uid;
        if (uid !== undefined) {
          setWorld((w) => demolish(w, uid));
          hitRef.current = { ...hitRef.current, uid: undefined };
          setHit(hitRef.current);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [placing, open, goBack]);

  // Wheel cycles material; Shift/Ctrl+wheel is left to the 3D view for zooming.
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (e.shiftKey || e.ctrlKey || e.deltaY === 0) return;
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
    const onWorld = (e.target as HTMLElement).dataset.world !== undefined;
    if (e.button === 0 && !e.altKey && placing && onWorld) {
      const h = pickAt(e.clientX, e.clientY);
      if (!h.plan) return;
      const a = snapAnchor(world, complete.category.id, h.plan.x, h.plan.y);
      setWorld((w) => place(w, complete, a.col, a.row, rot));
    }
  };

  const onPointerMove = (e: ReactPointerEvent) => {
    hitRef.current = pickAt(e.clientX, e.clientY);
    setHit(hitRef.current);
  };

  const foundations = world.pieces.filter((p) => p.category === 'foundation').length;
  const shortOf = check && !check.ok && complete && check.reason.startsWith('Not enough') ? complete.material.res : undefined;

  return (
    <div
      ref={stageRef}
      className={'stage' + (placing ? ' placing' : '')}
      style={{ ['--accent' as string]: accent, transform: scale === 1 ? undefined : `scale(${scale})` }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerLeave={() => {
        hitRef.current = { plan: null };
        setHit(hitRef.current);
      }}
      onContextMenu={(e) => e.preventDefault()}
      data-testid="stage"
    >
      <Scene3D
        ref={sceneRef}
        pieces={world.pieces}
        accent={accent}
        hoveredUid={hoveredUid}
        ghost={
          placing && anchor && check
            ? {
                piece: {
                  uid: -1,
                  category: complete.category.id,
                  variant: complete.variant.id,
                  material: complete.material.id,
                  texture: complete.texture.id,
                  col: anchor.col,
                  row: anchor.row,
                  rot,
                },
                valid: check.ok,
                label: check.ok ? undefined : check.reason,
              }
            : null
        }
      />

      {open && complete && (
        <>
          <Ghost rect={{ x: 1220, y: 740, w: BLOCK, h: BLOCK }} bg={complete.texture.bg} triangle={complete.variant.shape === 'triangle'} />
          <span className="preview-label">GHOST PLACEMENT</span>
        </>
      )}

      <ResourceBar resources={world.resources} short={shortOf} />
      <PieceCounts foundations={foundations} pieces={world.pieces.length} />

      {open && (
        <RadialMenu
          path={path}
          accent={accent}
          showLabels={showLabels}
          onPick={(depth, id) => setPath((p) => pick(p, depth, id, finishRef.current))}
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

      <KeyLegend />
    </div>
  );
}
