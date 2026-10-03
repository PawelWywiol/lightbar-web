import { GRID_CELL_STEP, GRID_FRICTION } from '../../editor.config';
import type { GridCell } from '../../editor.types';

export interface GridPoint {
  x: number;
  y: number;
}

export interface GridSize {
  rows: number;
  columns: number;
}

export const mod = (value: number, size: number): number => ((value % size) + size) % size;

const resolveCellIndex = (position: number, offset: number): number => Math.floor((position + offset) / GRID_CELL_STEP);

export const resolveBaseCell = (point: GridPoint, offset: GridPoint, size: GridSize): GridCell => ({
  row: mod(resolveCellIndex(point.y, offset.y), size.rows),
  column: mod(resolveCellIndex(point.x, offset.x), size.columns),
});

export const resolveVisibleRange = (offset: number, length: number) => ({
  start: Math.floor(offset / GRID_CELL_STEP),
  end: Math.ceil((offset + length) / GRID_CELL_STEP),
});

export interface GridDrop {
  to: number;
  shift: number;
}

export const resolveDrop = (fromRow: number, deltaY: number, rows: number): GridDrop => {
  const target = fromRow + Math.round(deltaY / GRID_CELL_STEP);
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

export const applyFriction = (velocity: number, elapsed: number): number => velocity * GRID_FRICTION ** (elapsed / 16);
