import { GRID_FRICTION, GRID_ZOOM_MAX, GRID_ZOOM_MIN } from '../../editor.config';
import type { GridCell } from '../../editor.types';

export interface GridPoint {
  x: number;
  y: number;
}

export interface GridSize {
  rows: number;
  columns: number;
}

export interface GridCopy {
  rowBlock: number;
  columnBlock: number;
}

export const mod = (value: number, size: number): number => ((value % size) + size) % size;

const resolveCellIndex = (position: number, offset: number, step: number): number =>
  Math.floor((position + offset) / step);

export const resolveBaseCell = (point: GridPoint, offset: GridPoint, size: GridSize, step: number): GridCell => ({
  row: mod(resolveCellIndex(point.y, offset.y, step), size.rows),
  column: mod(resolveCellIndex(point.x, offset.x, step), size.columns),
});

export const resolveCopy = (point: GridPoint, offset: GridPoint, size: GridSize, step: number): GridCopy => ({
  rowBlock: Math.floor(resolveCellIndex(point.y, offset.y, step) / size.rows),
  columnBlock: Math.floor(resolveCellIndex(point.x, offset.x, step) / size.columns),
});

export const resolveVisibleRange = (offset: number, length: number, step: number) => ({
  start: Math.floor(offset / step),
  end: Math.ceil((offset + length) / step),
});

export interface GridDrop {
  to: number;
  shift: number;
}

export const resolveDrop = (fromRow: number, deltaY: number, rows: number, step: number): GridDrop => {
  const target = fromRow + Math.round(deltaY / step);
  if (rows <= 1) return { to: fromRow, shift: 0 };
  if (target >= 0 && target < rows) return { to: target, shift: 0 };
  const to = mod(target, rows - 1);
  const block = Math.round((target - to) / rows);
  return { to, shift: target - to - block * rows };
};

export const resolveRowSlots = (rows: number, fromRow: number, toRow: number): number[] => {
  const order = Array.from({ length: rows }, (_, row) => row);
  const [moved] = order.splice(fromRow, 1);
  if (moved !== undefined) order.splice(toRow, 0, moved);
  const slots = Array.from({ length: rows }, () => 0);
  order.forEach((row, slot) => {
    slots[row] = slot;
  });
  return slots;
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
