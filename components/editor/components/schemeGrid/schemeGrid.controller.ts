import {
  GRID_CELL_STEP,
  GRID_LONG_PRESS_MS,
  GRID_MAX_FRAME_MS,
  GRID_MIN_VELOCITY,
  GRID_PAN_THRESHOLD,
  GRID_ROW_ANIMATION_SPEED,
  GRID_VELOCITY_TIMEOUT_MS,
  GRID_ZOOM_PINCH_SPEED,
  GRID_ZOOM_WHEEL_SPEED,
} from '../../editor.config';
import type { EditorMode, GridCell } from '../../editor.types';
import { drawGrid } from './schemeGrid.draw';
import { createSpaceTracker } from './schemeGrid.space';
import type { GridCopy, GridPoint } from './schemeGrid.utils';
import {
  applyFriction,
  resolveBaseCell,
  resolveCopy,
  resolveDrop,
  resolveRowSlots,
  resolveWheelDelta,
  resolveZoom,
} from './schemeGrid.utils';

export interface GridControllerProps {
  colors: string[][];
  mode: EditorMode;
  activeRow: number;
  paintColor: string;
}

export interface GridControllerCallbacks {
  onPaint: (cells: GridCell[]) => void;
  onSelectRow: (row: number) => void;
  onMoveRow: (from: number, to: number) => void;
}

export interface GridController {
  update: (props: GridControllerProps) => void;
  destroy: () => void;
}

type Gesture =
  | { kind: 'idle' }
  | { kind: 'pending'; start: GridPoint; timer: ReturnType<typeof setTimeout> }
  | { kind: 'paint'; last: GridPoint; cells: GridCell[] }
  | { kind: 'pan'; last: GridPoint; spread: number; time: number; velocity: GridPoint }
  | { kind: 'drag'; row: number; startY: number; pointerId: number };

const ZERO: GridPoint = { x: 0, y: 0 };

const identity = (length: number): number[] => Array.from({ length }, (_, index) => index);

const preventDefault = (event: Event) => event.preventDefault();

const distance = (a: GridPoint, b: GridPoint): number => Math.hypot(a.x - b.x, a.y - b.y);

const midpoint = (points: GridPoint[]): GridPoint => ({
  x: points.reduce((sum, point) => sum + point.x, 0) / points.length,
  y: points.reduce((sum, point) => sum + point.y, 0) / points.length,
});

const spreadOf = ([first, second]: GridPoint[]): number => (first && second ? distance(first, second) : 0);

const preventMiddleClick = (event: MouseEvent) => {
  if (event.button === 1) event.preventDefault();
};

const isMousePan = (event: PointerEvent, spaceHeld: boolean): boolean =>
  event.pointerType === 'mouse' && (event.button === 1 || event.button === 2 || (event.button === 0 && spaceHeld));

export const createGridController = (canvas: HTMLCanvasElement, callbacks: GridControllerCallbacks): GridController => {
  const context = canvas.getContext('2d');
  const pointers = new Map<number, GridPoint>();
  const space = createSpaceTracker(globalThis);
  const offset: GridPoint = { x: 0, y: 0 };
  let props: GridControllerProps = { colors: [], mode: 'paint', activeRow: 0, paintColor: '' };
  let colors: string[][] = [];
  let rowPositions: number[] = [];
  let rowTargets: number[] = [];
  let landing: { row: number; position: number } | null = null;
  let drag: { row: number; deltaY: number; shift: number } | null = null;
  let velocity: GridPoint = ZERO;
  let gesture: Gesture = { kind: 'idle' };
  let size = { width: 0, height: 0 };
  let ratio: GridPoint = { x: 1, y: 1 };
  let outlineColor = '';
  let borderColor = '';
  let zoom = 1;
  let activeCopy: GridCopy = { rowBlock: 0, columnBlock: 0 };
  let frameId = 0;
  let lastFrameTime = 0;

  const gridSize = () => ({ rows: colors.length, columns: colors[0]?.length ?? 1 });

  const step = () => GRID_CELL_STEP * zoom;

  const cellAt = (point: GridPoint) => resolveBaseCell(point, offset, gridSize(), step());

  const copyAt = (point: GridPoint) => resolveCopy(point, offset, gridSize(), step());

  const toPoint = (event: MouseEvent): GridPoint => {
    const rect = canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  const animateInertia = (elapsed: number): boolean => {
    if (gesture.kind === 'pan') return false;
    if (Math.abs(velocity.x) < GRID_MIN_VELOCITY && Math.abs(velocity.y) < GRID_MIN_VELOCITY) return false;
    offset.x -= velocity.x * elapsed;
    offset.y -= velocity.y * elapsed;
    velocity = { x: applyFriction(velocity.x, elapsed), y: applyFriction(velocity.y, elapsed) };
    return true;
  };

  const animateRows = (): boolean => {
    let moving = false;
    rowPositions = rowPositions.map((position, row) => {
      const target = rowTargets[row] ?? row;
      const next = position + (target - position) * GRID_ROW_ANIMATION_SPEED;
      if (Math.abs(target - next) < 0.01) return target;
      moving = true;
      return next;
    });
    return moving;
  };

  const render = (time: number) => {
    frameId = 0;
    const elapsed = lastFrameTime ? Math.min(time - lastFrameTime, GRID_MAX_FRAME_MS) : 16;
    const inertiaMoving = animateInertia(elapsed);
    const rowsMoving = animateRows();
    const moving = inertiaMoving || rowsMoving;
    if (context) {
      drawGrid(context, {
        ...size,
        offset,
        zoom,
        colors,
        rowPositions,
        activeRow: props.activeRow,
        activeCopy,
        drag,
        outlineColor,
        borderColor,
        ratio,
      });
    }
    lastFrameTime = moving ? time : 0;
    if (moving) requestDraw();
  };

  const requestDraw = () => {
    if (!frameId) frameId = requestAnimationFrame(render);
  };

  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    const pixelRatio = globalThis.devicePixelRatio || 1;
    size = { width: rect.width, height: rect.height };
    canvas.width = Math.round(rect.width * pixelRatio);
    canvas.height = Math.round(rect.height * pixelRatio);
    ratio = {
      x: rect.width ? canvas.width / rect.width : pixelRatio,
      y: rect.height ? canvas.height / rect.height : pixelRatio,
    };
    context?.setTransform(ratio.x, 0, 0, ratio.y, 0, 0);
    const style = getComputedStyle(canvas);
    outlineColor = style.color;
    borderColor = style.borderColor;
    requestDraw();
  };

  const resetRows = () => {
    rowPositions = identity(colors.length);
    rowTargets = identity(colors.length);
  };

  const setRowTargets = (targets: number[]) => {
    rowTargets = targets;
    rowPositions = rowPositions.map((position, row) => {
      const target = targets[row] ?? row;
      return position + targets.length * Math.round((target - position) / targets.length);
    });
  };

  const clearPending = () => {
    if (gesture.kind === 'pending') clearTimeout(gesture.timer);
  };

  const cancelPaint = () => {
    colors = props.colors.map((row) => [...row]);
    requestDraw();
  };

  const paintAt = (cells: GridCell[], point: GridPoint) => {
    const cell = cellAt(point);
    if (cells.some((item) => item.row === cell.row && item.column === cell.column)) return;
    cells.push(cell);
    const row = colors[cell.row];
    if (row) row[cell.column] = props.paintColor;
  };

  const paintTo = (point: GridPoint) => {
    if (gesture.kind !== 'paint') return;
    const { last, cells } = gesture;
    const steps = Math.max(1, Math.ceil(distance(last, point) / (step() / 2)));
    for (let index = 1; index <= steps; index++) {
      paintAt(cells, {
        x: last.x + ((point.x - last.x) * index) / steps,
        y: last.y + ((point.y - last.y) * index) / steps,
      });
    }
    gesture.last = point;
    requestDraw();
  };

  const zoomAt = (point: GridPoint, nextZoom: number) => {
    const next = resolveZoom(offset, point, zoom, nextZoom);
    Object.assign(offset, next.offset);
    zoom = next.zoom;
    requestDraw();
  };

  const startPan = () => {
    clearPending();
    space.markUsed();
    const points = [...pointers.values()];
    gesture = {
      kind: 'pan',
      last: midpoint(points),
      spread: spreadOf(points),
      time: performance.now(),
      velocity: ZERO,
    };
  };

  const regroupPan = () => {
    if (gesture.kind !== 'pan') return;
    const points = [...pointers.values()];
    gesture = { ...gesture, last: midpoint(points), spread: spreadOf(points) };
  };

  const panTo = () => {
    if (gesture.kind !== 'pan') return;
    const points = [...pointers.values()];
    const point = midpoint(points);
    const spread = spreadOf(points);
    const now = performance.now();
    const elapsed = Math.max(1, now - gesture.time);
    const delta = { x: point.x - gesture.last.x, y: point.y - gesture.last.y };
    offset.x -= delta.x;
    offset.y -= delta.y;
    if (gesture.spread > 0 && spread > 0) zoomAt(point, (zoom * spread) / gesture.spread);
    gesture = { kind: 'pan', last: point, spread, time: now, velocity: { x: delta.x / elapsed, y: delta.y / elapsed } };
    requestDraw();
  };

  const startDrag = (start: GridPoint, pointerId: number) => {
    const { row } = cellAt(start);
    activeCopy = copyAt(start);
    gesture = { kind: 'drag', row, startY: start.y, pointerId };
    drag = { row, deltaY: 0, shift: 0 };
    resetRows();
    callbacks.onSelectRow(row);
    requestDraw();
  };

  const moveDrag = (point: GridPoint) => {
    if (gesture.kind !== 'drag') return;
    const deltaY = point.y - gesture.startY;
    const { to, shift } = resolveDrop(gesture.row, deltaY, colors.length, step());
    drag = { row: gesture.row, deltaY, shift };
    activeCopy = { ...activeCopy, columnBlock: copyAt(point).columnBlock };
    setRowTargets(resolveRowSlots(colors.length, gesture.row, to).map((slot) => slot + shift));
    requestDraw();
  };

  const finishDrag = (row: number, cancelled: boolean) => {
    const deltaY = drag?.deltaY ?? 0;
    const steps = Math.round(deltaY / step());
    const residual = deltaY / step() - steps;
    drag = null;
    requestDraw();
    if (cancelled || steps === 0) {
      rowPositions[row] = row + deltaY / step();
      setRowTargets(identity(colors.length));
      return;
    }
    const { to, shift } = resolveDrop(row, deltaY, colors.length, step());
    activeCopy = { ...activeCopy, rowBlock: activeCopy.rowBlock + (row + steps - to - shift) / colors.length };
    offset.y -= shift * step();
    rowPositions = rowPositions.map((position) => position - shift);
    rowPositions[row] = to + residual;
    setRowTargets(resolveRowSlots(colors.length, row, to));
    if (to === row) return;
    landing = { row: to, position: to + residual };
    callbacks.onMoveRow(row, to);
  };

  const resolvePending = (point: GridPoint) => {
    if (gesture.kind === 'pending' && distance(gesture.start, point) >= GRID_PAN_THRESHOLD) startPan();
  };

  const selectAt = (point: GridPoint) => {
    activeCopy = copyAt(point);
    callbacks.onSelectRow(cellAt(point).row);
    requestDraw();
  };

  const finishGesture = (point: GridPoint, cancelled: boolean) => {
    const current = gesture;
    gesture = { kind: 'idle' };
    if (current.kind === 'paint') {
      if (cancelled) cancelPaint();
      else if (current.cells.length > 0) callbacks.onPaint(current.cells);
    }
    if (current.kind === 'pending') {
      clearTimeout(current.timer);
      if (!cancelled) selectAt(point);
    }
    if (current.kind === 'drag') finishDrag(current.row, cancelled);
  };

  const handleMultiPointerDown = (): boolean => {
    if (pointers.size > 2 && gesture.kind === 'pan') {
      regroupPan();
      return true;
    }
    if (pointers.size === 2 && gesture.kind !== 'drag') {
      if (gesture.kind === 'paint') cancelPaint();
      startPan();
      return true;
    }
    return pointers.size > 1;
  };

  const onPointerDown = (event: PointerEvent) => {
    const pans = isMousePan(event, space.isHeld());
    if (event.pointerType === 'mouse' && event.button !== 0 && !pans) return;
    canvas.setPointerCapture(event.pointerId);
    const point = toPoint(event);
    pointers.set(event.pointerId, point);
    velocity = ZERO;

    if (pans) {
      startPan();
      return;
    }
    if (handleMultiPointerDown()) return;

    if (props.mode === 'paint') {
      gesture = { kind: 'paint', last: point, cells: [] };
      paintAt(gesture.cells, point);
      requestDraw();
      return;
    }

    gesture = {
      kind: 'pending',
      start: point,
      timer: setTimeout(() => startDrag(point, event.pointerId), GRID_LONG_PRESS_MS),
    };
  };

  const onPointerMove = (event: PointerEvent) => {
    if (!pointers.has(event.pointerId)) return;
    const point = toPoint(event);
    pointers.set(event.pointerId, point);
    if (gesture.kind === 'paint') paintTo(point);
    if (gesture.kind === 'pan') panTo();
    if (gesture.kind === 'drag' && gesture.pointerId === event.pointerId) moveDrag(point);
    if (gesture.kind === 'pending') resolvePending(point);
  };

  const onPointerEnd = (event: PointerEvent) => {
    if (!pointers.delete(event.pointerId)) return;
    if (gesture.kind === 'pan') {
      if (pointers.size > 0) {
        regroupPan();
        return;
      }
      velocity = performance.now() - gesture.time < GRID_VELOCITY_TIMEOUT_MS ? gesture.velocity : ZERO;
      gesture = { kind: 'idle' };
      requestDraw();
      return;
    }
    if (pointers.size > 0 && !(gesture.kind === 'drag' && gesture.pointerId === event.pointerId)) return;
    finishGesture(toPoint(event), event.type === 'pointercancel');
  };

  const onWheel = (event: WheelEvent) => {
    event.preventDefault();
    if (gesture.kind === 'drag' || gesture.kind === 'pending') return;
    const delta = resolveWheelDelta(event.deltaY, event.deltaMode, size.height);
    const speed = event.ctrlKey ? GRID_ZOOM_PINCH_SPEED : GRID_ZOOM_WHEEL_SPEED;
    zoomAt(toPoint(event), zoom * Math.exp(-delta * speed));
  };

  const update = (next: GridControllerProps) => {
    if (next.colors !== props.colors) {
      colors = next.colors.map((row) => [...row]);
      resetRows();
      if (landing && landing.row < colors.length) rowPositions[landing.row] = landing.position;
      landing = null;
    }
    props = next;
    requestDraw();
  };

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(canvas);
  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerEnd);
  canvas.addEventListener('pointercancel', onPointerEnd);
  canvas.addEventListener('wheel', onWheel, { passive: false });
  canvas.addEventListener('contextmenu', preventDefault);
  canvas.addEventListener('mousedown', preventMiddleClick);

  return {
    update,
    destroy: () => {
      clearPending();
      cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerEnd);
      canvas.removeEventListener('pointercancel', onPointerEnd);
      canvas.removeEventListener('wheel', onWheel);
      canvas.removeEventListener('contextmenu', preventDefault);
      canvas.removeEventListener('mousedown', preventMiddleClick);
      space.destroy();
    },
  };
};
