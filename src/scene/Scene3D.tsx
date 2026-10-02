import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import {
  AmbientLight,
  BufferGeometry,
  Color,
  DirectionalLight,
  EdgesGeometry,
  Float32BufferAttribute,
  Fog,
  Group,
  HemisphereLight,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshStandardMaterial,
  PCFSoftShadowMap,
  PerspectiveCamera,
  Plane,
  PlaneGeometry,
  Raycaster,
  Scene,
  Vector2,
  Vector3,
  WebGLRenderer,
  type Material,
  type Object3D,
} from 'three';
import { CELL, STAGE, type Piece } from '../world';
import { pieceGeometry, pieceTop } from './geometry';
import { pieceMaterial } from './materials';

const GROUND_W = STAGE.width / CELL;
const GROUND_D = STAGE.height / CELL;
const TARGET = new Vector3(GROUND_W / 2, 0, GROUND_D / 2);
/** Opening view: looking over the starter pad from the south-east. */
const START = { target: new Vector3(8, 0, 11), yaw: 0.55, pitch: 0.9, dist: 22 };
const PAN_STEP = 1.5;
const MIN_PITCH = 0.25;
const MAX_PITCH = 1.45;
const MIN_DIST = 8;
const MAX_DIST = 48;
const DANGER = '#E0604A';

export interface ScenePick {
  /** Point on the build plane, in plan pixels (the units world.ts uses). */
  plan: { x: number; y: number } | null;
  /** The piece under the cursor, if any. */
  uid?: number;
}

export interface Scene3DHandle {
  pick(stageX: number, stageY: number, planeHeight: number): ScenePick;
}

export interface GhostSpec {
  piece: Piece;
  valid: boolean;
  label?: string;
}

interface Props {
  pieces: Piece[];
  ghost: GhostSpec | null;
  hoveredUid?: number;
  accent: string;
}

interface Internals {
  renderer: WebGLRenderer;
  scene: Scene;
  camera: PerspectiveCamera;
  piecesGroup: Group;
  ghostGroup: Group;
  view: { yaw: number; pitch: number; dist: number; goalYaw: number; target: Vector3; goalTarget: Vector3 };
  ghostAnchor: Vector3 | null;
}

function disposeGroup(group: Group) {
  group.traverse((o: Object3D) => {
    if (o instanceof Mesh || o instanceof LineSegments) {
      (o.geometry as BufferGeometry).dispose();
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      mats.forEach((m: Material) => m.dispose());
    }
  });
  group.clear();
}

function gridLines(): LineSegments {
  const pts: number[] = [];
  for (let x = 0; x <= GROUND_W; x++) pts.push(x, 0, 0, x, 0, GROUND_D);
  for (let z = 0; z <= GROUND_D; z++) pts.push(0, 0, z, GROUND_W, 0, z);
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(pts, 3));
  const lines = new LineSegments(g, new LineBasicMaterial({ color: '#223036', transparent: true, opacity: 0.7 }));
  lines.position.y = 0.002;
  return lines;
}

/** The build area rendered in 3D. Interaction state lives in BuildingPlan; this view only draws and picks. */
export const Scene3D = forwardRef<Scene3DHandle, Props>(function Scene3D({ pieces, ghost, hoveredUid, accent }, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);
  const internals = useRef<Internals | null>(null);
  const [failed, setFailed] = useState(false);

  // One-time scene setup.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let renderer: WebGLRenderer;
    try {
      renderer = new WebGLRenderer({ canvas, antialias: true });
    } catch {
      setFailed(true);
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(STAGE.width, STAGE.height, false);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = PCFSoftShadowMap;

    const scene = new Scene();
    scene.background = new Color('#0B1013');
    scene.fog = new Fog('#0B1013', 34, 80);

    const camera = new PerspectiveCamera(40, STAGE.width / STAGE.height, 0.1, 200);

    scene.add(new HemisphereLight('#c4d2db', '#2a1f14', 1.1));
    scene.add(new AmbientLight('#ffffff', 0.25));
    const sun = new DirectionalLight('#fff1dc', 2.4);
    sun.position.set(TARGET.x - 14, 24, TARGET.z + 12);
    sun.target.position.copy(TARGET);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, { left: -24, right: 24, top: 24, bottom: -24, near: 1, far: 70 });
    sun.shadow.bias = -0.0005;
    scene.add(sun, sun.target);

    const outer = new Mesh(new PlaneGeometry(400, 400), new MeshStandardMaterial({ color: '#0A0E10', roughness: 1 }));
    outer.rotation.x = -Math.PI / 2;
    outer.position.set(TARGET.x, -0.02, TARGET.z);
    const ground = new Mesh(new PlaneGeometry(GROUND_W, GROUND_D), new MeshStandardMaterial({ color: '#141C20', roughness: 1 }));
    ground.rotation.x = -Math.PI / 2;
    ground.position.copy(TARGET);
    ground.receiveShadow = true;
    scene.add(outer, ground, gridLines());

    const piecesGroup = new Group();
    const ghostGroup = new Group();
    scene.add(piecesGroup, ghostGroup);

    const view = {
      yaw: START.yaw,
      pitch: START.pitch,
      dist: START.dist,
      goalYaw: START.yaw,
      target: START.target.clone(),
      goalTarget: START.target.clone(),
    };
    internals.current = { renderer, scene, camera, piecesGroup, ghostGroup, view, ghostAnchor: null };

    const tmp = new Vector3();
    let frame = 0;
    const loop = () => {
      view.yaw += (view.goalYaw - view.yaw) * 0.18;
      view.target.lerp(view.goalTarget, 0.2);
      const cp = Math.cos(view.pitch);
      camera.position.set(
        view.target.x + Math.sin(view.yaw) * cp * view.dist,
        Math.sin(view.pitch) * view.dist,
        view.target.z + Math.cos(view.yaw) * cp * view.dist,
      );
      camera.lookAt(view.target);
      renderer.render(scene, camera);

      const label = labelRef.current;
      const anchor = internals.current?.ghostAnchor;
      if (label) {
        if (anchor && label.textContent) {
          tmp.copy(anchor).project(camera);
          label.style.left = `${((tmp.x + 1) / 2) * STAGE.width}px`;
          label.style.top = `${((1 - tmp.y) / 2) * STAGE.height}px`;
          label.style.visibility = 'visible';
        } else {
          label.style.visibility = 'hidden';
        }
      }
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);

    // Camera input: WASD/arrows pan, Q/E turn, middle-drag or Alt+drag orbits, Shift/Ctrl+wheel zooms.
    const PAN: Record<string, [number, number]> = {
      w: [0, -1], arrowup: [0, -1], s: [0, 1], arrowdown: [0, 1],
      a: [-1, 0], arrowleft: [-1, 0], d: [1, 0], arrowright: [1, 0],
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (k === 'q') view.goalYaw += Math.PI / 4;
      else if (k === 'e') view.goalYaw -= Math.PI / 4;
      else if (PAN[k]) {
        e.preventDefault();
        // Screen-relative: "up" moves away from the camera.
        const [right, back] = PAN[k];
        const cos = Math.cos(view.goalYaw);
        const sin = Math.sin(view.goalYaw);
        const t = view.goalTarget;
        t.x = Math.min(GROUND_W, Math.max(0, t.x + (right * cos + back * sin) * PAN_STEP));
        t.z = Math.min(GROUND_D, Math.max(0, t.z + (-right * sin + back * cos) * PAN_STEP));
      }
    };
    let drag: { x: number; y: number } | null = null;
    const onDown = (e: PointerEvent) => {
      if (e.button === 1 || (e.button === 0 && e.altKey)) {
        e.preventDefault();
        drag = { x: e.clientX, y: e.clientY };
        canvas.setPointerCapture(e.pointerId);
      }
    };
    const onMove = (e: PointerEvent) => {
      if (!drag) return;
      const dx = e.clientX - drag.x;
      const dy = e.clientY - drag.y;
      drag = { x: e.clientX, y: e.clientY };
      view.goalYaw -= dx * 0.008;
      view.yaw = view.goalYaw;
      view.pitch = Math.min(MAX_PITCH, Math.max(MIN_PITCH, view.pitch + dy * 0.006));
    };
    const onUp = (e: PointerEvent) => {
      if (drag) canvas.releasePointerCapture(e.pointerId);
      drag = null;
    };
    const onWheel = (e: WheelEvent) => {
      if (!(e.shiftKey || e.ctrlKey)) return;
      e.preventDefault();
      const delta = e.deltaY || e.deltaX;
      view.dist = Math.min(MAX_DIST, Math.max(MIN_DIST, view.dist * Math.exp(delta * 0.0015)));
    };
    window.addEventListener('keydown', onKey);
    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('wheel', onWheel, { passive: false });

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('keydown', onKey);
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('wheel', onWheel);
      disposeGroup(piecesGroup);
      disposeGroup(ghostGroup);
      renderer.dispose();
      internals.current = null;
    };
  }, []);

  // Placed pieces.
  useEffect(() => {
    const it = internals.current;
    if (!it) return;
    disposeGroup(it.piecesGroup);
    for (const p of pieces) {
      const group = new Group();
      group.userData.uid = p.uid;
      for (const g of pieceGeometry(p)) {
        const mesh = new Mesh(g, pieceMaterial(p.texture));
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.userData.uid = p.uid;
        group.add(mesh);
      }
      it.piecesGroup.add(group);
    }
  }, [pieces, failed]);

  // Demolish highlight.
  useEffect(() => {
    const it = internals.current;
    if (!it) return;
    for (const group of it.piecesGroup.children) {
      const hot = group.userData.uid === hoveredUid;
      group.traverse((o: Object3D) => {
        if (o instanceof Mesh) (o.material as MeshStandardMaterial).emissive.set(hot ? '#6a1d12' : '#000000');
      });
    }
  }, [hoveredUid, pieces]);

  // Ghost.
  const ghostKey = ghost
    ? [ghost.piece.category, ghost.piece.variant, ghost.piece.texture, ghost.piece.col, ghost.piece.row, ghost.piece.rot, ghost.valid, accent].join('|')
    : '';
  useEffect(() => {
    const it = internals.current;
    if (!it) return;
    disposeGroup(it.ghostGroup);
    it.ghostAnchor = null;
    if (!ghost) return;
    const edgeColor = ghost.valid ? accent : DANGER;
    for (const g of pieceGeometry(ghost.piece)) {
      const mat = pieceMaterial(ghost.piece.texture);
      mat.transparent = true;
      mat.opacity = 0.5;
      mat.depthWrite = false;
      if (!ghost.valid) mat.emissive.set('#5a160c');
      it.ghostGroup.add(new Mesh(g, mat));
      it.ghostGroup.add(new LineSegments(new EdgesGeometry(g, 20), new LineBasicMaterial({ color: edgeColor })));
    }
    it.ghostAnchor = new Vector3(ghost.piece.col + 1, pieceTop(ghost.piece) + 0.6, ghost.piece.row + 1);
  }, [ghostKey, failed]);

  useImperativeHandle(ref, () => ({
    pick(stageX, stageY, planeHeight) {
      const it = internals.current;
      if (!it) return { plan: null };
      const ndc = new Vector2((stageX / STAGE.width) * 2 - 1, -(stageY / STAGE.height) * 2 + 1);
      const ray = new Raycaster();
      ray.setFromCamera(ndc, it.camera);
      const hit = ray.intersectObject(it.piecesGroup, true)[0];
      const point = ray.ray.intersectPlane(new Plane(new Vector3(0, 1, 0), -planeHeight), new Vector3());
      return {
        plan: point ? { x: point.x * CELL, y: point.z * CELL } : null,
        uid: hit?.object.userData.uid as number | undefined,
      };
    },
  }));

  return (
    <>
      <canvas ref={canvasRef} className="world-canvas" data-world="" />
      {failed && <div className="world-fallback">The 3D view needs WebGL, which this browser has turned off.</div>}
      <span ref={labelRef} className="ghost-reason" style={{ visibility: 'hidden' }}>
        {ghost && !ghost.valid ? ghost.label : ''}
      </span>
    </>
  );
});
