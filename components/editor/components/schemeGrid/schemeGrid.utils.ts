import { GRID_FRICTION, GRID_WHEEL_LINE_HEIGHT, GRID_ZOOM_MAX, GRID_ZOOM_MIN } from '../../editor.config';
import type { GridCell } from '../../editor.types';

export interface GridPoint {
  x: number;
  y: number;
}

export interface GridLayout {
  heights: number[];
  columns: number;
}

export interface GridCopy {
  rowBlock: number;
  columnBlock: number;
}

export const mod = (value: number, size: number): number => ((value % size) + size) % size;

export const sum = (values: number[]): number => values.reduce((total, value) => total + value, 0);

export const resolveTops = (heights: number[]): number[] => {
  let top = 0;
  return heights.map((height) => {
    const current = top;
    top += height;
    return current;
  });
};

const resolveCellIndex = (position: number, offset: number, step: number): number =>
  Math.floor((position + offset) / step);

const resolveRowAt = (y: number, heights: number[]) => {
  const block = Math.floor(y / sum(heights));
  let rest = y - block * sum(heights);
  const row = heights.findIndex((height) => (rest -= height) < 0);
  return { row: row < 0 ? heights.length - 1 : row, block };
};

export const resolveBaseCell = (point: GridPoint, offset: GridPoint, layout: GridLayout, step: number): GridCell => ({
  row: resolveRowAt((point.y + offset.y) / step, layout.heights).row,
  column: mod(resolveCellIndex(point.x, offset.x, step), layout.columns),
});

export const resolveCopy = (point: GridPoint, offset: GridPoint, layout: GridLayout, step: number): GridCopy => ({
  rowBlock: resolveRowAt((point.y + offset.y) / step, layout.heights).block,
  columnBlock: Math.floor(resolveCellIndex(point.x, offset.x, step) / layout.columns),
});

export const resolveVisibleRange = (offset: number, length: number, step: number) => ({
  start: Math.floor(offset / step),
  end: Math.ceil((offset + length) / step),
});

export interface GridDrop {
  to: number;
  steps: number;
  shift: number;
  block: number;
  top: number;
  targets: number[];
}

const resolvePassed = (from: number, delta: number, heights: number[]) => {
  const rows = heights.length;
  const direction = Math.sign(delta);
  let steps = 0;
  let passed = 0;
  if (rows <= 1) return { steps, passed };
  const nextHeight = () => {
    const index = mod(steps, rows - 1);
    return heights[mod(direction > 0 ? from + 1 + index : from - 1 - index, rows)] ?? 1;
  };
  while (Math.abs(delta) >= passed + nextHeight() / 2) {
    passed += nextHeight();
    steps++;
  }
  return { steps: direction * steps, passed: direction * passed };
};

export const resolveDrop = (from: number, delta: number, heights: number[]): GridDrop => {
  const rows = heights.length;
  const { steps, passed } = resolvePassed(from, delta, heights);
  const target = from + steps;
  const to = target >= 0 && target < rows ? target : mod(target, rows - 1);
  const order = heights.map((_, row) => row).filter((row) => row !== from);
  order.splice(to, 0, from);
  const orderTops = resolveTops(order.map((row) => heights[row] ?? 1));
  const targets = heights.map((_, row) => orderTops[order.indexOf(row)] ?? 0);
  const top = (resolveTops(heights)[from] ?? 0) + passed;
  const total = sum(heights);
  const block = rows > 1 ? Math.round((top - (targets[from] ?? 0)) / total) : 0;
  const shift = rows > 1 ? top - (targets[from] ?? 0) - block * total : 0;
  return { to: rows > 1 ? to : from, steps, shift, block, top, targets };
};

export const resolveZoom = (offset: GridPoint, point: GridPoint, zoom: number, nextZoom: number) => {
  const next = Math.min(GRID_ZOOM_MAX, Math.max(GRID_ZOOM_MIN, nextZoom));
  const ratio = next / zoom;
  return {
    offset: { x: (point.x + offset.x) * ratio - point.x, y: (point.y + offset.y) * ratio - point.y },
    zoom: next,
  };
};

export const applyFriction = (velocity: number, elapsed: number): number => velocity * GRID_FRICTION ** (elapsed / 16);

export const resolveWheelDelta = (delta: number, deltaMode: number, pageHeight: number): number => {
  if (deltaMode === WheelEvent.DOM_DELTA_LINE) return delta * GRID_WHEEL_LINE_HEIGHT;
  if (deltaMode === WheelEvent.DOM_DELTA_PAGE) return delta * pageHeight;
  return delta;
};
