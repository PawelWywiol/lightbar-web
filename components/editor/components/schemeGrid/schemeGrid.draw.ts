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
  markerColor: string;
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

const drawMarkers = (context: CanvasRenderingContext2D, state: GridDrawState, first: number, last: number) => {
  const rows = state.colors.length;
  if (rows <= 1) return;
  context.fillStyle = state.markerColor;
  for (let block = first; block <= last; block++) {
    const y = block * rows * GRID_CELL_STEP - state.offset.y - GRID_CELL_GAP / 2 - 0.5;
    if (y >= 0 && y <= state.height) context.fillRect(0, y, state.width, 1);
  }
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
  const dragBlocks = Math.ceil(Math.abs(state.drag?.deltaY ?? 0) / (rows * GRID_CELL_STEP));
  const blocks = { first: Math.floor(start / rows) - 1 - dragBlocks, last: Math.ceil(end / rows) + 1 + dragBlocks };

  drawMarkers(context, state, blocks.first, blocks.last);
  const drawRowCopies = (row: number) => {
    for (let block = blocks.first; block <= blocks.last; block++) {
      const y = resolveRowY(state, row, block);
      if (y + GRID_CELL_STEP < 0 || y > state.height) continue;
      drawRow(context, state.colors[row] ?? [], y, state);
      if (row === state.activeRow) drawOutline(context, y, state);
    }
  };

  state.colors.forEach((_, row) => {
    if (row !== draggedRow) drawRowCopies(row);
  });
  if (draggedRow >= 0) drawRowCopies(draggedRow);
};
