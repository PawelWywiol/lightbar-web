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

export const resolveDropRow = (fromRow: number, deltaY: number, rows: number): number =>
  Math.min(rows - 1, Math.max(0, fromRow + Math.round(deltaY / GRID_CELL_STEP)));

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
