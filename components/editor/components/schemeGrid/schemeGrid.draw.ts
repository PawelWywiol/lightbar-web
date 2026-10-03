import {
  GRID_CELL_GAP,
  GRID_CELL_RADIUS,
  GRID_CELL_SIZE,
  GRID_CELL_STEP,
  GRID_SEPARATOR_DASH,
} from '../../editor.config';
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
  ratio: GridPoint;
}

interface GridMetrics {
  step: number;
  size: GridPoint;
  gap: number;
  radius: number;
  line: GridPoint;
}

interface GridBlocks {
  first: number;
  last: number;
}

const OUTLINE_WIDTH = 2;

const snap = (value: number, ratio: number): number => Math.round(value * ratio) / ratio;

const devicePixels = (width: number, ratio: number): number => Math.max(1, Math.round(width * ratio));

const resolveMetrics = ({ zoom, ratio }: GridDrawState): GridMetrics => ({
  step: GRID_CELL_STEP * zoom,
  size: { x: snap(GRID_CELL_SIZE * zoom, ratio.x), y: snap(GRID_CELL_SIZE * zoom, ratio.y) },
  gap: GRID_CELL_GAP * zoom,
  radius: GRID_CELL_RADIUS * zoom,
  line: { x: devicePixels(1, ratio.x) / ratio.x, y: devicePixels(1, ratio.y) / ratio.y },
});

const drawRow = (
  context: CanvasRenderingContext2D,
  rowColors: string[],
  y: number,
  state: GridDrawState,
  metrics: GridMetrics,
) => {
  const { step, size, radius, line } = metrics;
  const { start, end } = resolveVisibleRange(state.offset.x, state.width, step);
  const top = snap(y, state.ratio.y);
  for (let column = start; column < end; column++) {
    const left = snap(column * step - state.offset.x, state.ratio.x);
    context.fillStyle = rowColors[mod(column, rowColors.length)] ?? '';
    context.beginPath();
    context.roundRect(left, top, size.x, size.y, radius);
    context.fill();
    context.beginPath();
    context.roundRect(left + line.x / 2, top + line.y / 2, size.x - line.x, size.y - line.y, radius);
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
  const { ratio } = state;
  const pixels = devicePixels(OUTLINE_WIDTH, ratio.x);
  const center = (pixels % 2) / 2;
  const x = snap(state.activeCopy.columnBlock * columns * step - state.offset.x - gap / 2, ratio.x);
  const y = snap(resolveRowY(state, state.activeRow, state.activeCopy.rowBlock, step) - gap / 2, ratio.y);
  const width = snap(columns * step, ratio.x);
  const height = snap(step, ratio.y);
  if (x + width < 0 || x > state.width || y + height < 0 || y > state.height) return;
  context.strokeStyle = state.outlineColor;
  context.lineWidth = pixels / ratio.x;
  context.beginPath();
  context.roundRect(x + center / ratio.x, y + center / ratio.y, width, height, radius);
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
  const center = metrics.line.y / 2;
  context.lineWidth = metrics.line.y;
  context.beginPath();
  for (let block = blocks.first; block <= blocks.last; block++) {
    const y = snap((block * rows + shift) * metrics.step - state.offset.y - metrics.gap / 2, state.ratio.y);
    if (y < 0 || y > state.height) continue;
    context.moveTo(0, y + center);
    context.lineTo(state.width, y + center);
  }
  context.stroke();
};

const drawColumnSeparators = (context: CanvasRenderingContext2D, state: GridDrawState, metrics: GridMetrics) => {
  const columns = state.colors[0]?.length ?? 0;
  if (columns <= 1) return;
  const { start, end } = resolveVisibleRange(state.offset.x, state.width, metrics.step);
  const center = metrics.line.x / 2;
  context.lineWidth = metrics.line.x;
  context.beginPath();
  for (let block = Math.floor(start / columns); block <= Math.ceil(end / columns); block++) {
    const x = snap(block * columns * metrics.step - state.offset.x - metrics.gap / 2, state.ratio.x);
    if (x < 0 || x > state.width) continue;
    context.moveTo(x + center, 0);
    context.lineTo(x + center, state.height);
  }
  context.stroke();
};

export const drawGrid = (context: CanvasRenderingContext2D, state: GridDrawState): void => {
  context.clearRect(0, 0, state.width, state.height);
  const rows = state.colors.length;
  if (rows === 0) return;

  const metrics = resolveMetrics(state);
  const { step } = metrics;
  const { start, end } = resolveVisibleRange(state.offset.y, state.height, step);
  const draggedRow = state.drag?.row ?? -1;
  const dragBlocks = Math.ceil(Math.abs(state.drag?.deltaY ?? 0) / (rows * step));
  const blocks = { first: Math.floor(start / rows) - 1 - dragBlocks, last: Math.ceil(end / rows) + 1 + dragBlocks };

  context.strokeStyle = state.outlineColor;
  context.setLineDash(GRID_SEPARATOR_DASH);
  drawRowSeparators(context, state, metrics, blocks);
  drawColumnSeparators(context, state, metrics);
  context.setLineDash([]);
  context.strokeStyle = state.borderColor;
  context.lineWidth = metrics.line.x;
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
