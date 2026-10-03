import { GRID_CELL_GAP, GRID_CELL_RADIUS, GRID_CELL_SIZE, GRID_CELL_STEP } from '../../editor.config';
import type { GridCopy, GridPoint } from './schemeGrid.utils';
import { mod, resolveVisibleRange } from './schemeGrid.utils';

export interface GridDrawState {
  width: number;
  height: number;
  offset: GridPoint;
  zoom: number;
  colors: string[][];
  rowPositions: number[];
  activeRow: number;
  activeCopy: GridCopy;
  drag: { row: number; deltaY: number; shift: number } | null;
  outlineColor: string;
  borderColor: string;
}

interface GridMetrics {
  step: number;
  size: number;
  gap: number;
  radius: number;
}

interface GridBlocks {
  first: number;
  last: number;
}

const resolveMetrics = (zoom: number): GridMetrics => ({
  step: GRID_CELL_STEP * zoom,
  size: Math.round(GRID_CELL_SIZE * zoom),
  gap: GRID_CELL_GAP * zoom,
  radius: GRID_CELL_RADIUS * zoom,
});

const drawRow = (
  context: CanvasRenderingContext2D,
  rowColors: string[],
  y: number,
  state: GridDrawState,
  metrics: GridMetrics,
) => {
  const { step, size, radius } = metrics;
  const { start, end } = resolveVisibleRange(state.offset.x, state.width, step);
  const top = Math.round(y);
  for (let column = start; column < end; column++) {
    const left = Math.round(column * step - state.offset.x);
    context.fillStyle = rowColors[mod(column, rowColors.length)] ?? '';
    context.beginPath();
    context.roundRect(left, top, size, size, radius);
    context.fill();
    context.beginPath();
    context.roundRect(left + 0.5, top + 0.5, size - 1, size - 1, radius);
    context.stroke();
  }
};

const resolveRowY = (state: GridDrawState, row: number, block: number, step: number): number => {
  const isDragged = state.drag?.row === row;
  const slot = isDragged ? row : (state.rowPositions[row] ?? row);
  const dragOffset = isDragged ? (state.drag?.deltaY ?? 0) : 0;
  return (block * state.colors.length + slot) * step - state.offset.y + dragOffset;
};

const drawOutline = (context: CanvasRenderingContext2D, state: GridDrawState, metrics: GridMetrics) => {
  const columns = state.colors[state.activeRow]?.length;
  if (!columns) return;
  const { step, gap, radius } = metrics;
  const x = Math.round(state.activeCopy.columnBlock * columns * step - state.offset.x - gap / 2);
  const y = Math.round(resolveRowY(state, state.activeRow, state.activeCopy.rowBlock, step) - gap / 2);
  const width = Math.round(columns * step);
  const height = Math.round(step);
  if (x + width < 0 || x > state.width || y + height < 0 || y > state.height) return;
  context.strokeStyle = state.outlineColor;
  context.lineWidth = 2;
  context.beginPath();
  context.roundRect(x, y, width, height, radius);
  context.stroke();
};

const drawRowSeparators = (
  context: CanvasRenderingContext2D,
  state: GridDrawState,
  metrics: GridMetrics,
  blocks: GridBlocks,
) => {
  const rows = state.colors.length;
  if (rows <= 1) return;
  const shift = state.drag?.shift ?? 0;
  for (let block = blocks.first; block <= blocks.last; block++) {
    const y = Math.round((block * rows + shift) * metrics.step - state.offset.y - metrics.gap / 2);
    if (y >= 0 && y <= state.height) context.fillRect(0, y, state.width, 1);
  }
};

const drawColumnSeparators = (context: CanvasRenderingContext2D, state: GridDrawState, metrics: GridMetrics) => {
  const columns = state.colors[0]?.length ?? 0;
  if (columns <= 1) return;
  const { start, end } = resolveVisibleRange(state.offset.x, state.width, metrics.step);
  for (let block = Math.floor(start / columns); block <= Math.ceil(end / columns); block++) {
    const x = Math.round(block * columns * metrics.step - state.offset.x - metrics.gap / 2);
    if (x >= 0 && x <= state.width) context.fillRect(x, 0, 1, state.height);
  }
};

export const drawGrid = (context: CanvasRenderingContext2D, state: GridDrawState): void => {
  context.clearRect(0, 0, state.width, state.height);
  const rows = state.colors.length;
  if (rows === 0) return;

  const metrics = resolveMetrics(state.zoom);
  const { step } = metrics;
  const { start, end } = resolveVisibleRange(state.offset.y, state.height, step);
  const draggedRow = state.drag?.row ?? -1;
  const dragBlocks = Math.ceil(Math.abs(state.drag?.deltaY ?? 0) / (rows * step));
  const blocks = { first: Math.floor(start / rows) - 1 - dragBlocks, last: Math.ceil(end / rows) + 1 + dragBlocks };

  context.fillStyle = state.borderColor;
  drawRowSeparators(context, state, metrics, blocks);
  drawColumnSeparators(context, state, metrics);
  context.strokeStyle = state.borderColor;
  context.lineWidth = 1;
  const drawRowCopies = (row: number) => {
    for (let block = blocks.first; block <= blocks.last; block++) {
      const y = resolveRowY(state, row, block, step);
      if (y + step < 0 || y > state.height) continue;
      drawRow(context, state.colors[row] ?? [], y, state, metrics);
    }
  };

  state.colors.forEach((_, row) => {
    if (row !== draggedRow) drawRowCopies(row);
  });
  if (draggedRow >= 0) drawRowCopies(draggedRow);
  drawOutline(context, state, metrics);
};
