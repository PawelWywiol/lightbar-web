import {
  GRID_CELL_GAP,
  GRID_CELL_RADIUS,
  GRID_CELL_SIZE,
  GRID_CELL_STEP,
  GRID_GLOW_OPACITY,
  GRID_GLOW_SPREAD,
  GRID_INACTIVE_COPY_OPACITY,
  GRID_LABEL_FONT,
  GRID_LABEL_OPACITY,
  GRID_SEPARATOR_DASH,
  GRID_SEPARATOR_OPACITY,
} from '../../editor.config';
import type { GridCopy, GridPoint } from './schemeGrid.utils';
import { mod, resolveTops, resolveVisibleRange, sum } from './schemeGrid.utils';

export interface GridDrawState {
  width: number;
  height: number;
  offset: GridPoint;
  zoom: number;
  colors: string[][];
  fades: boolean[];
  heights: number[];
  rowPositions: number[];
  activeRow: number;
  activeCopy: GridCopy;
  drag: { row: number; deltaY: number; shift: number } | null;
  outlineColor: string;
  borderColor: string;
  ratio: GridPoint;
  labelWidth: number;
}

interface GridMetrics {
  step: number;
  width: number;
  gap: number;
  radius: number;
  line: GridPoint;
  tops: number[];
  total: number;
}

interface GridBlocks {
  first: number;
  last: number;
}

const OUTLINE_WIDTH = 2;

const snap = (value: number, ratio: number): number => Math.round(value * ratio) / ratio;

const devicePixels = (width: number, ratio: number): number => Math.max(1, Math.round(width * ratio));

const resolveMetrics = ({ zoom, ratio, heights }: GridDrawState): GridMetrics => ({
  step: GRID_CELL_STEP * zoom,
  width: snap(GRID_CELL_SIZE * zoom, ratio.x),
  gap: GRID_CELL_GAP * zoom,
  radius: GRID_CELL_RADIUS * zoom,
  line: { x: devicePixels(1, ratio.x) / ratio.x, y: devicePixels(1, ratio.y) / ratio.y },
  tops: resolveTops(heights),
  total: sum(heights),
});

const resolveFill = (
  context: CanvasRenderingContext2D,
  color: string,
  nextColor: string | undefined,
  top: number,
  height: number,
): string | CanvasGradient => {
  if (nextColor === undefined) return color;
  const gradient = context.createLinearGradient(0, top, 0, top + height);
  gradient.addColorStop(0, color);
  gradient.addColorStop(1, nextColor);
  return gradient;
};

// Halo instead of shadowBlur: blur per cell drops frames on older phones
const drawGlow = (
  context: CanvasRenderingContext2D,
  color: string,
  {
    left,
    top,
    width,
    height,
    radius,
    spread,
  }: Record<'left' | 'top' | 'width' | 'height' | 'radius' | 'spread', number>,
) => {
  if (!spread) return;
  context.globalAlpha = GRID_GLOW_OPACITY;
  context.fillStyle = color;
  context.beginPath();
  context.roundRect(left - spread, top - spread, width + 2 * spread, height + 2 * spread, radius + spread);
  context.fill();
};

const drawCell = (
  context: CanvasRenderingContext2D,
  fill: string | CanvasGradient,
  { left, top, width, height, radius }: Record<'left' | 'top' | 'width' | 'height' | 'radius', number>,
  line: GridPoint,
) => {
  context.fillStyle = fill;
  context.beginPath();
  context.roundRect(left, top, width, height, radius);
  context.fill();
  context.beginPath();
  context.roundRect(left + line.x / 2, top + line.y / 2, width - line.x, height - line.y, radius);
  context.stroke();
};

const drawRow = (
  context: CanvasRenderingContext2D,
  row: number,
  block: number,
  y: number,
  state: GridDrawState,
  metrics: GridMetrics,
) => {
  const { step, width, gap, radius, line } = metrics;
  const { start, end } = resolveVisibleRange(state.offset.x, state.width, step);
  const top = snap(y, state.ratio.y);
  const height = snap((state.heights[row] ?? 1) * step - gap, state.ratio.y);
  const rowColors = state.colors[row] ?? [];
  const nextColors = state.fades[row] ? state.colors[mod(row + 1, state.colors.length)] : undefined;
  for (let column = start; column < end; column++) {
    const left = snap(column * step - state.offset.x, state.ratio.x);
    const index = mod(column, rowColors.length);
    const isActiveCopy =
      block === state.activeCopy.rowBlock && Math.floor(column / rowColors.length) === state.activeCopy.columnBlock;
    const color = rowColors[index] ?? '';
    const cell = { left, top, width, height, radius };
    const glowSpread = Number(isActiveCopy) * GRID_GLOW_SPREAD * state.zoom;
    drawGlow(context, color, { ...cell, spread: glowSpread });
    context.globalAlpha = glowSpread ? 1 : GRID_INACTIVE_COPY_OPACITY;
    drawCell(context, resolveFill(context, color, nextColors?.[index], top, height), cell, line);
  }
  context.globalAlpha = 1;
};

const resolveRowY = (state: GridDrawState, row: number, block: number, metrics: GridMetrics): number => {
  const isDragged = state.drag?.row === row;
  const top = metrics.tops[row] ?? 0;
  const position = isDragged ? top : (state.rowPositions[row] ?? top);
  const dragOffset = isDragged ? (state.drag?.deltaY ?? 0) : 0;
  return (block * metrics.total + position) * metrics.step - state.offset.y + dragOffset;
};

const drawOutline = (context: CanvasRenderingContext2D, state: GridDrawState, metrics: GridMetrics) => {
  const columns = state.colors[state.activeRow]?.length;
  if (!columns) return;
  const { step, gap, radius } = metrics;
  const { ratio } = state;
  const pixels = devicePixels(OUTLINE_WIDTH, ratio.x);
  const center = (pixels % 2) / 2;
  const x = snap(state.activeCopy.columnBlock * columns * step - state.offset.x - gap / 2, ratio.x);
  const y = snap(resolveRowY(state, state.activeRow, state.activeCopy.rowBlock, metrics) - gap / 2, ratio.y);
  const width = snap(columns * step, ratio.x);
  const height = snap((state.heights[state.activeRow] ?? 1) * step, ratio.y);
  if (x + width < 0 || x > state.width || y + height < 0 || y > state.height) return;
  context.strokeStyle = state.outlineColor;
  context.lineWidth = pixels / ratio.x;
  context.beginPath();
  context.roundRect(x + center / ratio.x, y + center / ratio.y, width, height, radius + gap / 2);
  context.stroke();
};

const drawLabels = (
  context: CanvasRenderingContext2D,
  state: GridDrawState,
  metrics: GridMetrics,
  blocks: GridBlocks,
) => {
  context.fillStyle = state.outlineColor;
  context.font = GRID_LABEL_FONT;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  for (let block = blocks.first; block <= blocks.last; block++) {
    state.colors.forEach((_, row) => {
      const y = resolveRowY(state, row, block, metrics);
      const height = (state.heights[row] ?? 1) * metrics.step - metrics.gap;
      if (y + height < 0 || y > state.height) return;
      context.globalAlpha = row === state.activeRow && block === state.activeCopy.rowBlock ? 1 : GRID_LABEL_OPACITY;
      context.fillText(`${row + 1}`, -state.labelWidth / 2, y + height / 2);
    });
  }
  context.globalAlpha = 1;
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
  context.lineDashOffset = snap(state.offset.x, state.ratio.x);
  context.beginPath();
  for (let block = blocks.first; block <= blocks.last; block++) {
    const y = snap((block * metrics.total + shift) * metrics.step - state.offset.y - metrics.gap / 2, state.ratio.y);
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
  context.lineDashOffset = snap(state.offset.y, state.ratio.y);
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
  context.clearRect(-state.labelWidth, 0, state.width + state.labelWidth, state.height);
  const rows = state.colors.length;
  if (rows === 0) return;

  const metrics = resolveMetrics(state);
  const blockHeight = metrics.total * metrics.step;
  const draggedRow = state.drag?.row ?? -1;
  const dragBlocks = Math.ceil(Math.abs(state.drag?.deltaY ?? 0) / blockHeight);
  const blocks = {
    first: Math.floor(state.offset.y / blockHeight) - 1 - dragBlocks,
    last: Math.ceil((state.offset.y + state.height) / blockHeight) + 1 + dragBlocks,
  };

  if (state.labelWidth > 0) {
    context.save();
    context.beginPath();
    context.rect(0, 0, state.width, state.height);
    context.clip();
  }
  context.strokeStyle = state.outlineColor;
  context.globalAlpha = GRID_SEPARATOR_OPACITY;
  context.setLineDash(GRID_SEPARATOR_DASH);
  drawRowSeparators(context, state, metrics, blocks);
  drawColumnSeparators(context, state, metrics);
  context.globalAlpha = 1;
  context.setLineDash([]);
  context.lineDashOffset = 0;
  context.strokeStyle = state.borderColor;
  context.lineWidth = metrics.line.x;
  const drawRowCopies = (row: number) => {
    for (let block = blocks.first; block <= blocks.last; block++) {
      const y = resolveRowY(state, row, block, metrics);
      if (y + (state.heights[row] ?? 1) * metrics.step < 0 || y > state.height) continue;
      drawRow(context, row, block, y, state, metrics);
    }
  };

  state.colors.forEach((_, row) => {
    if (row !== draggedRow) drawRowCopies(row);
  });
  if (draggedRow >= 0) drawRowCopies(draggedRow);
  drawOutline(context, state, metrics);
  if (state.labelWidth > 0) {
    context.restore();
    drawLabels(context, state, metrics, blocks);
  }
};
