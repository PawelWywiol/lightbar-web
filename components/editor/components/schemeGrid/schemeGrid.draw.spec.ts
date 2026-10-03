import { describe, expect, it, vi } from 'vitest';
import { GRID_CELL_GAP, GRID_CELL_STEP } from '../../editor.config';
import type { GridDrawState } from './schemeGrid.draw';
import { drawGrid } from './schemeGrid.draw';

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

const createContext = () => {
  const fills: ({ color: string } & Rect)[] = [];
  const strokes: ({ color: string; lineWidth: number } & Rect)[] = [];
  const lines: ({ color: string; alpha: number } & Rect)[] = [];
  let rect: Rect = { x: 0, y: 0, width: 0, height: 0 };
  const context = {
    fillStyle: '',
    globalAlpha: 1,
    strokeStyle: '',
    lineWidth: 0,
    clearRect: vi.fn(),
    beginPath: vi.fn(),
    roundRect: vi.fn((x: number, y: number, width: number, height: number) => {
      rect = { x, y, width, height };
    }),
    fill: vi.fn(() => {
      fills.push({ color: context.fillStyle, ...rect });
    }),
    stroke: vi.fn(() => {
      strokes.push({ color: context.strokeStyle, lineWidth: context.lineWidth, ...rect });
    }),
    strokeRect: vi.fn(),
    fillRect: vi.fn((x: number, y: number, width: number, height: number) => {
      lines.push({ color: context.fillStyle, alpha: context.globalAlpha, x, y, width, height });
    }),
    setTransform: vi.fn(),
  };
  return { context, fills, strokes, lines, canvasContext: context as unknown as CanvasRenderingContext2D };
};

const createState = (overrides: Partial<GridDrawState> = {}): GridDrawState => ({
  width: 4 * GRID_CELL_STEP,
  height: GRID_CELL_STEP,
  offset: { x: 0, y: 0 },
  zoom: 1,
  colors: [['a', 'b']],
  rowPositions: [0],
  activeRow: -1,
  activeCopy: { rowBlock: 0, columnBlock: 0 },
  drag: null,
  outlineColor: 'white',
  borderColor: 'border',
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
const vertical = (lines: Rect[]) => lines.filter(({ width }) => width === 1);
const horizontal = (lines: Rect[]) => lines.filter(({ height }) => height === 1);

describe('drawGrid', () => {
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

  it('marks the start of every row block with a full-opacity border line', () => {
    const { context, lines, canvasContext } = createContext();
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
      color: 'border',
      alpha: 1,
      x: 0,
      y: 2 * GRID_CELL_STEP - GRID_CELL_GAP / 2,
      width: GRID_CELL_STEP,
      height: 1,
    });
    expect(lines.every(({ y }) => Number.isInteger(y) && y >= 0 && y <= 3 * GRID_CELL_STEP)).toBe(true);
    expect(context.globalAlpha).toBe(1);
  });

  it('marks the start of every column block with a vertical border line', () => {
    const { lines, canvasContext } = createContext();
    drawGrid(canvasContext, createState({ width: 5 * GRID_CELL_STEP, offset: { x: 0.4, y: 0 } }));
    expect(vertical(lines)).toEqual([
      { color: 'border', alpha: 1, x: 2 * GRID_CELL_STEP - GRID_CELL_GAP / 2, y: 0, width: 1, height: GRID_CELL_STEP },
      { color: 'border', alpha: 1, x: 4 * GRID_CELL_STEP - GRID_CELL_GAP / 2, y: 0, width: 1, height: GRID_CELL_STEP },
    ]);
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

  it('skips block markers for a single row and a single column', () => {
    const { lines, canvasContext } = createContext();
    drawGrid(canvasContext, createState({ height: 3 * GRID_CELL_STEP, colors: [['a']] }));
    expect(lines).toEqual([]);
  });
});
