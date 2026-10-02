import { describe, expect, it, vi } from 'vitest';
import { GRID_CELL_STEP } from '../../editor.config';
import type { GridDrawState } from './schemeGrid.draw';
import { drawGrid } from './schemeGrid.draw';

const createContext = () => {
  const fills: { color: string; y: number }[] = [];
  let y = 0;
  const context = {
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 0,
    clearRect: vi.fn(),
    beginPath: vi.fn(),
    roundRect: vi.fn((_x: number, rectY: number) => {
      y = rectY;
    }),
    fill: vi.fn(() => {
      fills.push({ color: context.fillStyle, y });
    }),
    strokeRect: vi.fn(),
    setTransform: vi.fn(),
  };
  return { context, fills, canvasContext: context as unknown as CanvasRenderingContext2D };
};

const createState = (overrides: Partial<GridDrawState> = {}): GridDrawState => ({
  width: 4 * GRID_CELL_STEP,
  height: GRID_CELL_STEP,
  offset: { x: 0, y: 0 },
  colors: [['a', 'b']],
  rowPositions: [0],
  activeRow: -1,
  drag: null,
  outlineColor: 'white',
  ...overrides,
});

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

  it('draws the dragged row on top of every other row', () => {
    const { fills, canvasContext } = createContext();
    const state = createState({
      width: GRID_CELL_STEP,
      height: 6 * GRID_CELL_STEP,
      colors: [['r0'], ['r1']],
      rowPositions: [0, 1],
      drag: { row: 1, deltaY: 3 * GRID_CELL_STEP },
    });
    drawGrid(canvasContext, state);
    const colors = fills.map(({ color }) => color);
    expect(colors.filter((color) => color === 'r1').length).toBeGreaterThan(0);
    expect(colors.indexOf('r1')).toBeGreaterThan(colors.lastIndexOf('r0'));
  });

  it('outlines the active row only when one is active', () => {
    const inactive = createContext();
    drawGrid(inactive.canvasContext, createState());
    expect(inactive.context.strokeRect).not.toHaveBeenCalled();

    const active = createContext();
    drawGrid(active.canvasContext, createState({ activeRow: 0 }));
    expect(active.context.strokeRect).toHaveBeenCalled();
  });
});
