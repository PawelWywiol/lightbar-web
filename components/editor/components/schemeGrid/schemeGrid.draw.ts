import { GRID_CELL_GAP, GRID_CELL_RADIUS, GRID_CELL_SIZE, GRID_CELL_STEP } from '../../editor.config';
import type { GridPoint } from './schemeGrid.utils';
import { mod, resolveVisibleRange } from './schemeGrid.utils';

export interface GridDrawState {
  width: number;
  height: number;
  offset: GridPoint;
  colors: string[][];
  rowPositions: number[];
  activeRow: number;
  drag: { row: number; deltaY: number } | null;
  outlineColor: string;
}

const drawRow = (context: CanvasRenderingContext2D, rowColors: string[], y: number, state: GridDrawState) => {
  const { start, end } = resolveVisibleRange(state.offset.x, state.width);
  for (let column = start; column < end; column++) {
    context.fillStyle = rowColors[mod(column, rowColors.length)] ?? '';
    context.beginPath();
    context.roundRect(column * GRID_CELL_STEP - state.offset.x, y, GRID_CELL_SIZE, GRID_CELL_SIZE, GRID_CELL_RADIUS);
    context.fill();
  }
};

const drawOutline = (context: CanvasRenderingContext2D, y: number, state: GridDrawState) => {
  context.strokeStyle = state.outlineColor;
  context.lineWidth = 2;
  context.strokeRect(0, y - GRID_CELL_GAP / 2, state.width, GRID_CELL_STEP);
};

const resolveRowY = (state: GridDrawState, row: number, block: number): number => {
  const isDragged = state.drag?.row === row;
  const slot = isDragged ? row : (state.rowPositions[row] ?? row);
  const dragOffset = isDragged ? (state.drag?.deltaY ?? 0) : 0;
  return (block * state.colors.length + slot) * GRID_CELL_STEP - state.offset.y + dragOffset;
};

export const drawGrid = (context: CanvasRenderingContext2D, state: GridDrawState): void => {
  context.clearRect(0, 0, state.width, state.height);
  const rows = state.colors.length;
  if (rows === 0) return;

  const { start, end } = resolveVisibleRange(state.offset.y, state.height);
  const draggedRow = state.drag?.row ?? -1;
  const order = state.colors.map((_, row) => row).filter((row) => row !== draggedRow);
  if (draggedRow >= 0) order.push(draggedRow);

  for (let block = Math.floor(start / rows) - 1; block <= Math.ceil(end / rows) + 1; block++) {
    for (const row of order) {
      const y = resolveRowY(state, row, block);
      if (y + GRID_CELL_STEP < 0 || y > state.height) continue;
      drawRow(context, state.colors[row] ?? [], y, state);
      if (row === state.activeRow) drawOutline(context, y, state);
    }
  }
};
