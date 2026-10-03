import { describe, expect, it, vi } from 'vitest';
import { GRID_CELL_GAP, GRID_CELL_STEP, GRID_SEPARATOR_DASH } from '../../editor.config';
import type { GridDrawState } from './schemeGrid.draw';
import { drawGrid } from './schemeGrid.draw';
import { mod } from './schemeGrid.utils';

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

const createContext = () => {
  const fills: ({ color: string } & Rect)[] = [];
  const strokes: ({ color: string; lineWidth: number; dash: number[] } & Rect)[] = [];
  const lines: ({ color: string; dash: number[] } & Rect)[] = [];
  const dashes: number[][] = [];
  const dashOffsets: { isHorizontal: boolean; offset: number }[] = [];
  let rect: Rect | null = null;
  let segments: { x: number; y: number; toX: number; toY: number }[] = [];
  let start = { x: 0, y: 0 };
  const context = {
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 0,
    lineDash: [] as number[],
    lineDashOffset: 0,
    clearRect: vi.fn(),
    beginPath: vi.fn(() => {
      rect = null;
      segments = [];
    }),
    roundRect: vi.fn((x: number, y: number, width: number, height: number) => {
      rect = { x, y, width, height };
    }),
    moveTo: vi.fn((x: number, y: number) => {
      start = { x, y };
    }),
    lineTo: vi.fn((toX: number, toY: number) => {
      segments.push({ ...start, toX, toY });
    }),
    setLineDash: vi.fn((dash: number[]) => {
      context.lineDash = [...dash];
      dashes.push([...dash]);
    }),
    fill: vi.fn(() => {
      if (rect) fills.push({ color: context.fillStyle, ...rect });
    }),
    stroke: vi.fn(() => {
      const { strokeStyle: color, lineWidth, lineDash: dash } = context;
      segments.forEach(({ x, y, toX, toY }) => {
        dashOffsets.push({ isHorizontal: y === toY, offset: context.lineDashOffset });
        const half = lineWidth / 2;
        lines.push(
          y === toY
            ? { color, dash, x: Math.min(x, toX), y: y - half, width: Math.abs(toX - x), height: lineWidth }
            : { color, dash, x: x - half, y: Math.min(y, toY), width: lineWidth, height: Math.abs(toY - y) },
        );
      });
      if (rect) strokes.push({ color, lineWidth, dash, ...rect });
    }),
    setTransform: vi.fn(),
    createLinearGradient: vi.fn((x0: number, y0: number, x1: number, y1: number) => {
      const stops: string[] = [];
      return { line: [x0, y0, x1, y1], stops, addColorStop: (_: number, color: string) => stops.push(color) };
    }),
  };
  return {
    context,
    fills,
    strokes,
    lines,
    dashes,
    dashOffsets,
    canvasContext: context as unknown as CanvasRenderingContext2D,
  };
};

const createState = (overrides: Partial<GridDrawState> = {}): GridDrawState => ({
  width: 4 * GRID_CELL_STEP,
  height: GRID_CELL_STEP,
  offset: { x: 0, y: 0 },
  zoom: 1,
  colors: [['a', 'b']],
  fades: [],
  rowPositions: [0],
  activeRow: -1,
  activeCopy: { rowBlock: 0, columnBlock: 0 },
  drag: null,
  outlineColor: 'white',
  borderColor: 'border',
  ratio: { x: 1, y: 1 },
  ...overrides,
});

const twoByTwo = {
  colors: [
    ['a', 'b'],
    ['c', 'd'],
  ],
  rowPositions: [0, 1],
};
const outlines = (strokes: ({ lineWidth: number } & Rect)[]) =>
  strokes.filter(({ lineWidth }) => lineWidth === 2).map(({ x, y, width, height }) => ({ x, y, width, height }));
const FRACTIONAL_RATIO = 1.5;
const devicePhase = (value: number) => (Math.round(mod(value * FRACTIONAL_RATIO, 1) * 1e6) / 1e6) % 1;
const devicePhases = ({ x, y, width, height }: Rect) => [x, y, width, height].map(devicePhase);
const vertical = (lines: Rect[]) => lines.filter(({ width }) => width === 1);
const horizontal = (lines: Rect[]) => lines.filter(({ height }) => height === 1);

describe('drawGrid', () => {
  it('fades each cell into the same cell of the next row, wrapping to the first', () => {
    const { fills, canvasContext } = createContext();
    drawGrid(canvasContext, createState({ ...twoByTwo, fades: [true, true], width: 2 * GRID_CELL_STEP }));
    const size = GRID_CELL_STEP - GRID_CELL_GAP;
    const gradientAt = (top: number) =>
      fills.filter(({ y }) => y === top).map(({ color }) => color as unknown as { line: number[]; stops: string[] });
    expect(gradientAt(0)).toMatchObject([
      { line: [0, 0, 0, size], stops: ['a', 'c'] },
      { line: [0, 0, 0, size], stops: ['b', 'd'] },
    ]);
    expect(gradientAt(GRID_CELL_STEP)).toMatchObject([
      { line: [0, GRID_CELL_STEP, 0, GRID_CELL_STEP + size], stops: ['c', 'a'] },
      { line: [0, GRID_CELL_STEP, 0, GRID_CELL_STEP + size], stops: ['d', 'b'] },
    ]);
  });

  it('fills step rows with a solid color', () => {
    const { fills, context, canvasContext } = createContext();
    drawGrid(canvasContext, createState({ ...twoByTwo, fades: [false, true], height: 2 * GRID_CELL_STEP }));
    expect(fills.filter(({ y }) => y === 0).map(({ color }) => color)).toEqual(['a', 'b', 'a', 'b']);
    expect(context.createLinearGradient).toHaveBeenCalled();
  });

  it('repeats the base columns across the width', () => {
    const { fills, canvasContext } = createContext();
    drawGrid(canvasContext, createState());
    expect(fills.filter(({ y }) => y === 0).map(({ color }) => color)).toEqual(['a', 'b', 'a', 'b']);
  });

  it('maps a negative x offset to the right base color', () => {
    const { fills, canvasContext } = createContext();
    drawGrid(canvasContext, createState({ offset: { x: -GRID_CELL_STEP, y: 0 } }));
    expect(fills[0]?.color).toBe('b');
  });

  it('scales cells with the zoom', () => {
    const { fills, canvasContext } = createContext();
    drawGrid(canvasContext, createState({ zoom: 2, height: 2 * GRID_CELL_STEP }));
    expect(fills.filter(({ y }) => y === 0).map(({ x }) => x)).toEqual([0, 2 * GRID_CELL_STEP]);
    expect(fills[0]?.width).toBe(2 * (GRID_CELL_STEP - GRID_CELL_GAP));
  });

  it('strokes every cell with a crisp border', () => {
    const { fills, strokes, canvasContext } = createContext();
    drawGrid(canvasContext, createState());
    const borders = strokes.filter(({ lineWidth }) => lineWidth === 1);
    expect(borders).toHaveLength(fills.length);
    expect(borders.every(({ color }) => color === 'border')).toBe(true);
    expect(borders).toContainEqual(
      expect.objectContaining({ x: 0.5, y: 0.5, width: GRID_CELL_STEP - GRID_CELL_GAP - 1 }),
    );
  });

  it('draws the dragged row on top of every other row', () => {
    const { fills, canvasContext } = createContext();
    const state = createState({
      width: GRID_CELL_STEP,
      height: 6 * GRID_CELL_STEP,
      colors: [['r0'], ['r1']],
      rowPositions: [0, 1],
      drag: { row: 1, deltaY: 3 * GRID_CELL_STEP, shift: 0 },
    });
    drawGrid(canvasContext, state);
    const colors = fills.map(({ color }) => color);
    expect(colors.filter((color) => color === 'r1').length).toBeGreaterThan(0);
    expect(colors.indexOf('r1')).toBeGreaterThan(colors.lastIndexOf('r0'));
  });

  it('outlines only the active copy of the active row', () => {
    const { context, strokes, canvasContext } = createContext();
    drawGrid(
      canvasContext,
      createState({
        ...twoByTwo,
        width: 6 * GRID_CELL_STEP,
        height: 4 * GRID_CELL_STEP,
        activeRow: 1,
        activeCopy: { rowBlock: 1, columnBlock: 1 },
      }),
    );
    expect(outlines(strokes)).toEqual([
      {
        x: 2 * GRID_CELL_STEP - GRID_CELL_GAP / 2,
        y: 3 * GRID_CELL_STEP - GRID_CELL_GAP / 2,
        width: 2 * GRID_CELL_STEP,
        height: GRID_CELL_STEP,
      },
    ]);
    expect(context.strokeStyle).toBe('white');
  });

  it('scales the outline with the zoom', () => {
    const { strokes, canvasContext } = createContext();
    drawGrid(
      canvasContext,
      createState({
        ...twoByTwo,
        zoom: 2,
        width: 6 * GRID_CELL_STEP,
        height: 4 * GRID_CELL_STEP,
        activeRow: 1,
        activeCopy: { rowBlock: 0, columnBlock: 1 },
      }),
    );
    expect(outlines(strokes)).toEqual([
      {
        x: 4 * GRID_CELL_STEP - GRID_CELL_GAP,
        y: 2 * GRID_CELL_STEP - GRID_CELL_GAP,
        width: 4 * GRID_CELL_STEP,
        height: 2 * GRID_CELL_STEP,
      },
    ]);
  });

  it('skips the outline when no row is active or the copy is off screen', () => {
    const inactive = createContext();
    drawGrid(inactive.canvasContext, createState());
    expect(outlines(inactive.strokes)).toEqual([]);

    const hidden = createContext();
    drawGrid(hidden.canvasContext, createState({ activeRow: 0, activeCopy: { rowBlock: 3, columnBlock: 0 } }));
    expect(outlines(hidden.strokes)).toEqual([]);
  });

  it('marks the start of every row block with a dashed foreground line', () => {
    const { lines, canvasContext } = createContext();
    drawGrid(
      canvasContext,
      createState({
        width: GRID_CELL_STEP,
        height: 3 * GRID_CELL_STEP,
        offset: { x: 0, y: 0.4 },
        colors: [['r0'], ['r1']],
        rowPositions: [0, 1],
      }),
    );
    expect(horizontal(lines)).toContainEqual({
      color: 'white',
      dash: GRID_SEPARATOR_DASH,
      x: 0,
      y: 2 * GRID_CELL_STEP - GRID_CELL_GAP / 2,
      width: GRID_CELL_STEP,
      height: 1,
    });
    expect(lines.every(({ y }) => Number.isInteger(y) && y >= 0 && y <= 3 * GRID_CELL_STEP)).toBe(true);
  });

  it('marks the start of every column block with a dashed foreground line', () => {
    const { lines, canvasContext } = createContext();
    drawGrid(canvasContext, createState({ width: 5 * GRID_CELL_STEP, offset: { x: 0.4, y: 0 } }));
    const line = { color: 'white', dash: GRID_SEPARATOR_DASH, y: 0, width: 1, height: GRID_CELL_STEP };
    expect(vertical(lines)).toEqual([
      { ...line, x: 2 * GRID_CELL_STEP - GRID_CELL_GAP / 2 },
      { ...line, x: 4 * GRID_CELL_STEP - GRID_CELL_GAP / 2 },
    ]);
  });

  it.each([0.5, 1, 2])('keeps separators one css pixel wide with a constant dash at zoom %s', (zoom) => {
    [1, 2].forEach((ratio) => {
      const { lines, canvasContext } = createContext();
      drawGrid(
        canvasContext,
        createState({ ...twoByTwo, zoom, ratio: { x: ratio, y: ratio }, height: 8 * GRID_CELL_STEP }),
      );
      expect(vertical(lines).length).toBeGreaterThan(0);
      expect(horizontal(lines).length).toBeGreaterThan(0);
      expect(lines.every(({ width, height }) => Math.min(width, height) === 1)).toBe(true);
      expect(lines.every(({ dash }) => dash.join() === GRID_SEPARATOR_DASH.join())).toBe(true);
    });
  });

  it('sets the separator dash then resets it before drawing cell borders', () => {
    const { context, strokes, dashes, canvasContext } = createContext();
    drawGrid(canvasContext, createState({ ...twoByTwo, height: 4 * GRID_CELL_STEP }));
    expect(dashes).toEqual([GRID_SEPARATOR_DASH, []]);
    expect(context.lineDash).toEqual([]);
    expect(strokes.length).toBeGreaterThan(0);
    expect(strokes.every(({ color, dash }) => color === 'border' && dash.length === 0)).toBe(true);
  });

  it('anchors the separator dashes to the content while panning', () => {
    const { context, dashOffsets, canvasContext } = createContext();
    drawGrid(
      canvasContext,
      createState({ ...twoByTwo, width: 6 * GRID_CELL_STEP, height: 6 * GRID_CELL_STEP, offset: { x: 13.4, y: 7.6 } }),
    );
    const horizontalOffsets = dashOffsets.filter(({ isHorizontal }) => isHorizontal).map(({ offset }) => offset);
    const verticalOffsets = dashOffsets.filter(({ isHorizontal }) => !isHorizontal).map(({ offset }) => offset);
    expect(horizontalOffsets.length).toBeGreaterThan(0);
    expect(verticalOffsets.length).toBeGreaterThan(0);
    expect(new Set(horizontalOffsets)).toEqual(new Set([13]));
    expect(new Set(verticalOffsets)).toEqual(new Set([8]));
    expect(context.lineDashOffset).toBe(0);
  });

  it('snaps the separator dash offset to device pixels at ratio 2', () => {
    const { dashOffsets, canvasContext } = createContext();
    drawGrid(
      canvasContext,
      createState({
        ...twoByTwo,
        ratio: { x: 2, y: 2 },
        width: 6 * GRID_CELL_STEP,
        height: 6 * GRID_CELL_STEP,
        offset: { x: 13.3, y: 7.6 },
      }),
    );
    expect(dashOffsets.length).toBeGreaterThan(0);
    expect(dashOffsets.every(({ offset }) => (offset * 2) % 1 === 0)).toBe(true);
    expect(dashOffsets.some(({ offset }) => offset % 1 === 0.5)).toBe(true);
  });

  it('moves the row block marker with the drag preview shift', () => {
    const { lines, canvasContext } = createContext();
    drawGrid(
      canvasContext,
      createState({
        height: 3 * GRID_CELL_STEP,
        colors: [['r0'], ['r1']],
        rowPositions: [0, 1],
        drag: { row: 1, deltaY: GRID_CELL_STEP, shift: -1 },
      }),
    );
    expect(horizontal(lines).map(({ y }) => y)).toContain(GRID_CELL_STEP - GRID_CELL_GAP / 2);
  });

  it('aligns cells, borders, separators and the outline to device pixels at a fractional ratio', () => {
    const { fills, strokes, lines, canvasContext } = createContext();
    drawGrid(
      canvasContext,
      createState({
        ...twoByTwo,
        ratio: { x: FRACTIONAL_RATIO, y: FRACTIONAL_RATIO },
        zoom: 1.1,
        offset: { x: 0.4, y: 0.7 },
        width: 6 * GRID_CELL_STEP,
        height: 4 * GRID_CELL_STEP,
        activeRow: 1,
      }),
    );
    const borders = strokes.filter(({ color }) => color === 'border');
    const borderEdges = borders.map(({ lineWidth, x, y, width, height }) => ({
      x: x - lineWidth / 2,
      y: y - lineWidth / 2,
      width: width + lineWidth,
      height: height + lineWidth,
    }));
    expect(borders).toHaveLength(fills.length);
    expect(lines.length).toBeGreaterThan(0);
    expect(new Set([...fills, ...lines, ...borderEdges].flatMap(devicePhases))).toEqual(new Set([0]));
    expect(new Set(borders.map(({ lineWidth }) => lineWidth * FRACTIONAL_RATIO))).toEqual(new Set([2]));
    expect(outlines(strokes).map(devicePhases)).toEqual([[0.5, 0.5, 0, 0]]);
  });

  it('skips block markers for a single row and a single column', () => {
    const { lines, canvasContext } = createContext();
    drawGrid(canvasContext, createState({ height: 3 * GRID_CELL_STEP, colors: [['a']] }));
    expect(lines).toEqual([]);
  });
});
