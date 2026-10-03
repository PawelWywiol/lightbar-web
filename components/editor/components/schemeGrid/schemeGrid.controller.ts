import {
  GRID_CELL_STEP,
  GRID_LONG_PRESS_MS,
  GRID_MAX_FRAME_MS,
  GRID_MIN_VELOCITY,
  GRID_PAN_THRESHOLD,
  GRID_ROW_ANIMATION_SPEED,
  GRID_VELOCITY_TIMEOUT_MS,
} from '../../editor.config';
import type { EditorMode, GridCell } from '../../editor.types';
import { drawGrid } from './schemeGrid.draw';
import type { GridPoint } from './schemeGrid.utils';
import { applyFriction, resolveBaseCell, resolveDrop, resolveRowSlots } from './schemeGrid.utils';

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
  | { kind: 'pending'; start: GridPoint; pointerType: string; timer: ReturnType<typeof setTimeout> | undefined }
  | { kind: 'paint'; last: GridPoint; cells: GridCell[] }
  | { kind: 'pan'; last: GridPoint; time: number; velocity: GridPoint }
  | { kind: 'drag'; row: number; startY: number; pointerId: number };

const ZERO: GridPoint = { x: 0, y: 0 };

const identity = (length: number): number[] => Array.from({ length }, (_, index) => index);

const preventDefault = (event: Event) => event.preventDefault();

const distance = (a: GridPoint, b: GridPoint): number => Math.hypot(a.x - b.x, a.y - b.y);

const midpoint = (points: GridPoint[]): GridPoint => ({
  x: points.reduce((sum, point) => sum + point.x, 0) / points.length,
  y: points.reduce((sum, point) => sum + point.y, 0) / points.length,
});

export const createGridController = (canvas: HTMLCanvasElement, callbacks: GridControllerCallbacks): GridController => {
  const context = canvas.getContext('2d');
  const pointers = new Map<number, GridPoint>();
  const offset: GridPoint = { x: 0, y: 0 };
  let props: GridControllerProps = { colors: [], mode: 'paint', activeRow: 0, paintColor: '' };
  let colors: string[][] = [];
  let rowPositions: number[] = [];
  let rowTargets: number[] = [];
  let landing: { row: number; position: number } | null = null;
  let drag: { row: number; deltaY: number } | null = null;
  let velocity: GridPoint = ZERO;
  let gesture: Gesture = { kind: 'idle' };
  let size = { width: 0, height: 0 };
  let outlineColor = '';
  let markerColor = '';
  let frameId = 0;
  let lastFrameTime = 0;

  const gridSize = () => ({ rows: colors.length, columns: colors[0]?.length ?? 1 });

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
        colors,
        rowPositions,
        activeRow: props.activeRow,
        drag,
        outlineColor,
        markerColor,
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
    const ratio = globalThis.devicePixelRatio || 1;
    size = { width: rect.width, height: rect.height };
    canvas.width = Math.round(rect.width * ratio);
    canvas.height = Math.round(rect.height * ratio);
    context?.setTransform(ratio, 0, 0, ratio, 0, 0);
    outlineColor = getComputedStyle(canvas).color;
    markerColor = `color-mix(in srgb, ${outlineColor} 35%, transparent)`;
    requestDraw();
  };

  const resetRows = () => {
    rowPositions = identity(colors.length);
    rowTargets = identity(colors.length);
  };

  const clearPending = () => {
    if (gesture.kind === 'pending') clearTimeout(gesture.timer);
  };

  const cancelPaint = () => {
    colors = props.colors.map((row) => [...row]);
    requestDraw();
  };

  const paintAt = (cells: GridCell[], point: GridPoint) => {
    const cell = resolveBaseCell(point, offset, gridSize());
    if (cells.some((item) => item.row === cell.row && item.column === cell.column)) return;
    cells.push(cell);
    const row = colors[cell.row];
    if (row) row[cell.column] = props.paintColor;
  };

  const paintTo = (point: GridPoint) => {
    if (gesture.kind !== 'paint') return;
    const { last, cells } = gesture;
    const steps = Math.max(1, Math.ceil(distance(last, point) / (GRID_CELL_STEP / 2)));
    for (let step = 1; step <= steps; step++) {
      paintAt(cells, {
        x: last.x + ((point.x - last.x) * step) / steps,
        y: last.y + ((point.y - last.y) * step) / steps,
      });
    }
    gesture.last = point;
    requestDraw();
  };

  const startPan = (point: GridPoint) => {
    clearPending();
    gesture = { kind: 'pan', last: point, time: performance.now(), velocity: ZERO };
  };

  const panTo = (point: GridPoint) => {
    if (gesture.kind !== 'pan') return;
    const now = performance.now();
    const elapsed = Math.max(1, now - gesture.time);
    const delta = { x: point.x - gesture.last.x, y: point.y - gesture.last.y };
    offset.x -= delta.x;
    offset.y -= delta.y;
    gesture = { kind: 'pan', last: point, time: now, velocity: { x: delta.x / elapsed, y: delta.y / elapsed } };
    requestDraw();
  };

  const startDrag = (row: number, startY: number, pointerId: number) => {
    gesture = { kind: 'drag', row, startY, pointerId };
    drag = { row, deltaY: 0 };
    resetRows();
    callbacks.onSelectRow(row);
    requestDraw();
  };

  const moveDrag = (point: GridPoint) => {
    if (gesture.kind !== 'drag') return;
    const deltaY = point.y - gesture.startY;
    drag = { row: gesture.row, deltaY };
    const { to, shift } = resolveDrop(gesture.row, deltaY, colors.length);
    rowTargets = resolveRowSlots(colors.length, gesture.row, to).map((slot) => slot + shift);
    requestDraw();
  };

  const finishDrag = (row: number, cancelled: boolean) => {
    const deltaY = drag?.deltaY ?? 0;
    const { to, shift } = cancelled ? { to: row, shift: 0 } : resolveDrop(row, deltaY, colors.length);
    const residual = deltaY / GRID_CELL_STEP - Math.round(deltaY / GRID_CELL_STEP);
    drag = null;
    rowTargets = identity(colors.length);
    requestDraw();
    if (to === row && shift === 0) {
      rowPositions[row] = row + deltaY / GRID_CELL_STEP;
      return;
    }
    offset.y -= shift * GRID_CELL_STEP;
    rowTargets = resolveRowSlots(colors.length, row, to);
    rowPositions = rowPositions.map((position) => position - shift);
    rowPositions[row] = to + residual;
    if (to === row) return;
    landing = { row: to, position: to + residual };
    callbacks.onMoveRow(row, to);
  };

  const resolvePending = (point: GridPoint, pointerId: number) => {
    if (gesture.kind !== 'pending' || distance(gesture.start, point) < GRID_PAN_THRESHOLD) return;
    if (gesture.pointerType !== 'mouse') {
      startPan(point);
      return;
    }
    const { start } = gesture;
    startDrag(resolveBaseCell(start, offset, gridSize()).row, start.y, pointerId);
    moveDrag(point);
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
      if (!cancelled) callbacks.onSelectRow(resolveBaseCell(point, offset, gridSize()).row);
    }
    if (current.kind === 'drag') finishDrag(current.row, cancelled);
  };

  const handleMultiPointerDown = (): boolean => {
    if (pointers.size > 2 && gesture.kind === 'pan') {
      gesture = { ...gesture, last: midpoint([...pointers.values()]) };
      return true;
    }
    if (pointers.size === 2 && gesture.kind !== 'drag') {
      if (gesture.kind === 'paint') cancelPaint();
      startPan(midpoint([...pointers.values()]));
      return true;
    }
    return pointers.size > 1;
  };

  const onPointerDown = (event: PointerEvent) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    canvas.setPointerCapture(event.pointerId);
    const point = toPoint(event);
    pointers.set(event.pointerId, point);
    velocity = ZERO;

    if (handleMultiPointerDown()) return;

    if (props.mode === 'paint') {
      gesture = { kind: 'paint', last: point, cells: [] };
      paintAt(gesture.cells, point);
      requestDraw();
      return;
    }

    const { row } = resolveBaseCell(point, offset, gridSize());
    gesture = {
      kind: 'pending',
      start: point,
      pointerType: event.pointerType,
      timer:
        event.pointerType === 'mouse'
          ? undefined
          : setTimeout(() => startDrag(row, point.y, event.pointerId), GRID_LONG_PRESS_MS),
    };
  };

  const onPointerMove = (event: PointerEvent) => {
    if (!pointers.has(event.pointerId)) return;
    const point = toPoint(event);
    pointers.set(event.pointerId, point);
    if (gesture.kind === 'paint') paintTo(point);
    if (gesture.kind === 'pan') panTo(midpoint([...pointers.values()]));
    if (gesture.kind === 'drag' && gesture.pointerId === event.pointerId) moveDrag(point);
    if (gesture.kind === 'pending') resolvePending(point, event.pointerId);
  };

  const onPointerEnd = (event: PointerEvent) => {
    if (!pointers.delete(event.pointerId)) return;
    if (gesture.kind === 'pan') {
      const remaining = [...pointers.values()];
      if (remaining.length > 0) {
        gesture = { ...gesture, last: midpoint(remaining) };
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
    const scale = event.deltaMode === WheelEvent.DOM_DELTA_LINE ? GRID_CELL_STEP : 1;
    velocity = ZERO;
    offset.x += (event.deltaX + (event.shiftKey ? event.deltaY : 0)) * scale;
    offset.y += (event.shiftKey ? 0 : event.deltaY) * scale;
    requestDraw();
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
    },
  };
};
