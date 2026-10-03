import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GRID_CELL_GAP, GRID_CELL_SIZE, GRID_CELL_STEP, GRID_LONG_PRESS_MS } from '../../editor.config';
import type { EditorMode } from '../../editor.types';
import type { GridController } from './schemeGrid.controller';
import { createGridController } from './schemeGrid.controller';
import { mod } from './schemeGrid.utils';

const colors = [
  ['a', 'b', 'c'],
  ['d', 'e', 'f'],
  ['g', 'h', 'i'],
];

const at = (column: number, row: number) => ({
  clientX: column * GRID_CELL_STEP + 1,
  clientY: row * GRID_CELL_STEP + 1,
});

const unitHeights = new WeakMap<string[][], number[]>();
const heightsOf = (rows: string[][]) => {
  const heights = unitHeights.get(rows) ?? rows.map(() => 1);
  unitHeights.set(rows, heights);
  return heights;
};

const controllers: GridController[] = [];

const setup = (
  mode: EditorMode,
  gridColors = colors,
  rect = new DOMRect(0, 0, 4 * GRID_CELL_STEP, 3 * GRID_CELL_STEP),
) => {
  const canvas = document.createElement('canvas');
  canvas.setPointerCapture = vi.fn();
  canvas.getBoundingClientRect = () => rect;
  const callbacks = { onPaint: vi.fn(), onSelectRow: vi.fn(), onMoveRow: vi.fn() };
  const controller = createGridController(canvas, callbacks);
  controller.update({
    colors: gridColors,
    fades: [],
    heights: heightsOf(gridColors),
    mode,
    activeRow: 0,
    paintColor: 'x',
  });
  controllers.push(controller);
  const dispatch = (type: string, init: PointerEventInit) =>
    canvas.dispatchEvent(
      new PointerEvent(type, { bubbles: true, button: 0, pointerType: 'mouse', pointerId: 1, ...init }),
    );
  const wheel = (init: WheelEventInit) => canvas.dispatchEvent(new WheelEvent('wheel', { bubbles: true, ...init }));
  const mouseDown = (button: number) =>
    canvas.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, button }));
  return { callbacks, controller, dispatch, wheel, mouseDown };
};

const press = (type: 'keydown' | 'keyup', target: EventTarget = window) => {
  const event = new KeyboardEvent(type, { bubbles: true, cancelable: true, code: 'Space' });
  target.dispatchEvent(event);
  return event;
};

const spacePan = (dispatch: ReturnType<typeof setup>['dispatch']) => {
  press('keydown');
  dispatch('pointerdown', at(0, 0));
  dispatch('pointermove', at(1, 0));
  dispatch('pointerup', at(1, 0));
};

beforeEach(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      constructor(private readonly callback: () => void) {}
      observe = () => this.callback();
      disconnect = vi.fn();
    },
  );
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
});

afterEach(() => {
  for (const controller of controllers.splice(0)) controller.destroy();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

interface Fill {
  color: string;
  x: number;
  y: number;
  size: number;
}

interface Stroke {
  lineWidth: number;
  x: number;
  y: number;
  width: number;
}

const createFakeContext = () => {
  const fills: Fill[] = [];
  const strokes: Stroke[] = [];
  let rect = { x: 0, y: 0, width: 0 };
  const fake = {
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 0,
    clearRect: vi.fn(),
    beginPath: vi.fn(),
    roundRect: vi.fn((x: number, y: number, width: number) => {
      rect = { x, y, width };
    }),
    fill: vi.fn(() => {
      fills.push({ color: fake.fillStyle, x: rect.x, y: rect.y, size: rect.width });
    }),
    stroke: vi.fn(() => {
      strokes.push({ lineWidth: fake.lineWidth, ...rect });
    }),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    setLineDash: vi.fn(),
    setTransform: vi.fn(),
  };
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(fake as unknown as CanvasRenderingContext2D);
  return { fills, strokes, context: fake };
};

const drawFrame = (fills: Fill[], strokes: Stroke[] = []) => {
  fills.length = 0;
  strokes.length = 0;
  vi.advanceTimersToNextFrame();
  return fills.map(({ color }) => color);
};

const drawFrames = (fills: Fill[]) => {
  const frames: Fill[][] = [];
  while (vi.getTimerCount() > 0) {
    drawFrame(fills);
    frames.push([...fills]);
  }
  return frames;
};

const firstRowColor = (fills: Fill[]) => fills.find(({ y }) => y === 0)?.color;

const topLeftColor = (fills: Fill[]) => fills.find(({ x, y }) => x === 0 && y === 0)?.color;

const drawnZoom = (fills: Fill[]) => (fills[0]?.size ?? 0) / GRID_CELL_SIZE;

const outline = (strokes: Stroke[]) => strokes.find(({ lineWidth }) => lineWidth === 2);

const longPress = () => vi.advanceTimersByTime(GRID_LONG_PRESS_MS);

const isWhole = (value: number) => Math.abs(value - Math.round(value)) < 1e-9;

const zoomAfterWheel = (init: WheelEventInit) => {
  const { fills } = createFakeContext();
  const { wheel } = setup('paint');
  wheel(init);
  drawFrame(fills);
  controllers.pop()?.destroy();
  return drawnZoom(fills);
};

describe('createGridController', () => {
  describe('paint mode', () => {
    it('paints the clicked base cell', () => {
      const { callbacks, dispatch } = setup('paint');
      dispatch('pointerdown', at(1, 0));
      dispatch('pointerup', at(1, 0));
      expect(callbacks.onPaint).toHaveBeenCalledWith([{ row: 0, column: 1 }]);
    });

    it('paints the row under the pointer when rows have different heights', () => {
      const { callbacks, controller, dispatch } = setup('paint');
      controller.update({ colors, fades: [], heights: [2, 0.5, 1], mode: 'paint', activeRow: 0, paintColor: 'x' });
      dispatch('pointerdown', at(0, 1));
      dispatch('pointermove', { clientX: 1, clientY: 2.2 * GRID_CELL_STEP });
      dispatch('pointerup', { clientX: 1, clientY: 2.2 * GRID_CELL_STEP });
      expect(callbacks.onPaint).toHaveBeenCalledWith([
        { row: 0, column: 0 },
        { row: 1, column: 0 },
      ]);
    });

    it('maps a repeated copy to its base cell', () => {
      const { callbacks, dispatch } = setup('paint');
      dispatch('pointerdown', at(4, 5));
      dispatch('pointerup', at(4, 5));
      expect(callbacks.onPaint).toHaveBeenCalledWith([{ row: 2, column: 1 }]);
    });

    it('collects every crossed cell once per stroke', () => {
      const { callbacks, dispatch } = setup('paint');
      dispatch('pointerdown', at(0, 0));
      dispatch('pointermove', at(2, 0));
      dispatch('pointermove', at(0, 0));
      dispatch('pointerup', at(0, 0));
      expect(callbacks.onPaint).toHaveBeenCalledTimes(1);
      expect(callbacks.onPaint).toHaveBeenCalledWith([
        { row: 0, column: 0 },
        { row: 0, column: 1 },
        { row: 0, column: 2 },
      ]);
    });

    it('cancels the stroke when a second finger touches', () => {
      const { callbacks, dispatch } = setup('paint');
      dispatch('pointerdown', { ...at(0, 0), pointerType: 'touch', pointerId: 1 });
      dispatch('pointerdown', { ...at(2, 2), pointerType: 'touch', pointerId: 2 });
      dispatch('pointermove', { ...at(1, 1), pointerType: 'touch', pointerId: 2 });
      dispatch('pointerup', { ...at(0, 0), pointerType: 'touch', pointerId: 1 });
      dispatch('pointerup', { ...at(1, 1), pointerType: 'touch', pointerId: 2 });
      expect(callbacks.onPaint).not.toHaveBeenCalled();
    });

    it.each([1, 2])('pans with mouse button %i instead of painting', (button) => {
      vi.useFakeTimers();
      const { fills } = createFakeContext();
      const { callbacks, dispatch } = setup('paint');
      dispatch('pointerdown', { ...at(0, 0), button });
      dispatch('pointermove', { ...at(1, 0), button });
      drawFrame(fills);
      dispatch('pointerup', { ...at(1, 0), button });
      expect(callbacks.onPaint).not.toHaveBeenCalled();
      expect(topLeftColor(fills)).toBe('c');
    });

    it('pans with Space and the left button instead of painting', () => {
      vi.useFakeTimers();
      const { fills } = createFakeContext();
      const { callbacks, dispatch } = setup('paint');
      press('keydown');
      dispatch('pointerdown', at(0, 0));
      dispatch('pointermove', at(1, 0));
      drawFrame(fills);
      dispatch('pointerup', at(1, 0));
      press('keyup');
      expect(callbacks.onPaint).not.toHaveBeenCalled();
      expect(topLeftColor(fills)).toBe('c');
      dispatch('pointerdown', at(1, 0));
      dispatch('pointerup', at(1, 0));
      expect(callbacks.onPaint).toHaveBeenCalledWith([{ row: 0, column: 0 }]);
    });

    it('blocks the Space keyup only when Space was used for a pan', () => {
      const { callbacks, dispatch } = setup('paint');
      press('keydown');
      expect(press('keyup').defaultPrevented).toBe(false);
      spacePan(dispatch);
      expect(press('keyup').defaultPrevented).toBe(true);
      expect(callbacks.onPaint).not.toHaveBeenCalled();
    });

    it('releases Space on window blur', () => {
      const { callbacks, dispatch } = setup('paint');
      press('keydown');
      window.dispatchEvent(new Event('blur'));
      dispatch('pointerdown', at(0, 0));
      dispatch('pointermove', at(1, 0));
      dispatch('pointerup', at(1, 0));
      expect(callbacks.onPaint).toHaveBeenCalledWith([
        { row: 0, column: 0 },
        { row: 0, column: 1 },
      ]);
    });

    it('prevents middle-click autoscroll without blocking other buttons', () => {
      const { mouseDown } = setup('paint');
      expect(mouseDown(1)).toBe(false);
      expect(mouseDown(0)).toBe(true);
      expect(mouseDown(2)).toBe(true);
    });

    it('ignores Space typed into a text field', () => {
      const { callbacks, dispatch } = setup('paint');
      const input = document.createElement('input');
      document.body.append(input);
      press('keydown', input);
      dispatch('pointerdown', at(0, 0));
      dispatch('pointerup', at(0, 0));
      input.remove();
      expect(callbacks.onPaint).toHaveBeenCalledWith([{ row: 0, column: 0 }]);
    });
  });

  describe('edit mode', () => {
    it('selects the base row on tap', () => {
      const { callbacks, dispatch } = setup('edit');
      dispatch('pointerdown', at(0, 4));
      dispatch('pointerup', at(0, 4));
      expect(callbacks.onSelectRow).toHaveBeenCalledWith(1);
      expect(callbacks.onMoveRow).not.toHaveBeenCalled();
    });

    it.each(['mouse', 'touch'])('moves a row after a %s long press', (pointerType) => {
      vi.useFakeTimers();
      const { callbacks, dispatch } = setup('edit');
      dispatch('pointerdown', { ...at(0, 0), pointerType });
      longPress();
      dispatch('pointermove', { ...at(0, 2), pointerType });
      dispatch('pointerup', { ...at(0, 2), pointerType });
      expect(callbacks.onSelectRow).toHaveBeenCalledWith(0);
      expect(callbacks.onMoveRow).toHaveBeenCalledWith(0, 2);
    });

    it.each(['mouse', 'touch'])('pans instead of dragging when the %s moves before the long press', (pointerType) => {
      vi.useFakeTimers();
      const { callbacks, dispatch } = setup('edit');
      dispatch('pointerdown', { ...at(0, 0), pointerType });
      dispatch('pointermove', { ...at(0, 2), pointerType });
      longPress();
      dispatch('pointerup', { ...at(0, 2), pointerType });
      expect(callbacks.onMoveRow).not.toHaveBeenCalled();
      expect(callbacks.onSelectRow).not.toHaveBeenCalled();
    });

    it('finishes the drag when the dragging pointer lifts while another pointer rests', () => {
      vi.useFakeTimers();
      const { callbacks, dispatch } = setup('edit');
      dispatch('pointerdown', { ...at(0, 0), pointerId: 1 });
      longPress();
      dispatch('pointermove', { ...at(0, 1), pointerId: 1 });
      dispatch('pointerdown', { ...at(2, 2), pointerType: 'touch', pointerId: 2 });
      dispatch('pointermove', { ...at(0, 0), pointerType: 'touch', pointerId: 2 });
      dispatch('pointermove', { ...at(0, 2), pointerId: 1 });
      dispatch('pointerup', { ...at(0, 2), pointerId: 1 });
      expect(callbacks.onMoveRow).toHaveBeenCalledWith(0, 2);
    });

    it('wraps the last row dragged past the block end', () => {
      vi.useFakeTimers();
      const { callbacks, dispatch } = setup('edit');
      dispatch('pointerdown', at(0, 2));
      longPress();
      dispatch('pointermove', at(0, 3));
      dispatch('pointerup', at(0, 3));
      expect(callbacks.onMoveRow).toHaveBeenCalledWith(2, 1);
    });

    it('does not move a row dropped on its own slot', () => {
      vi.useFakeTimers();
      const { callbacks, dispatch } = setup('edit');
      dispatch('pointerdown', at(0, 1));
      longPress();
      dispatch('pointermove', { clientX: 1, clientY: GRID_CELL_STEP + 12 });
      dispatch('pointerup', { clientX: 1, clientY: GRID_CELL_STEP + 12 });
      expect(callbacks.onMoveRow).not.toHaveBeenCalled();
    });

    it('moves a dragged row at a different zoom', () => {
      vi.useFakeTimers();
      const { callbacks, dispatch, wheel } = setup('edit');
      for (let index = 0; index < 20; index++) wheel({ clientX: 0, clientY: 0, deltaY: -1000 });
      dispatch('pointerdown', { clientX: 1, clientY: 1 });
      longPress();
      dispatch('pointermove', { clientX: 1, clientY: 1 + 2 * GRID_CELL_STEP });
      dispatch('pointerup', { clientX: 1, clientY: 1 + 2 * GRID_CELL_STEP });
      expect(callbacks.onMoveRow).toHaveBeenCalledWith(0, 1);
    });
  });

  describe('zoom', () => {
    it('zooms in on wheel up keeping the cell under the cursor', () => {
      vi.useFakeTimers();
      const { fills } = createFakeContext();
      const { callbacks, dispatch, wheel } = setup('paint');
      wheel({ ...at(2, 1), deltaY: -100 });
      drawFrame(fills);
      expect(drawnZoom(fills)).toBeGreaterThan(1.1);
      dispatch('pointerdown', at(2, 1));
      dispatch('pointerup', at(2, 1));
      expect(callbacks.onPaint).toHaveBeenCalledWith([{ row: 1, column: 2 }]);
    });

    it('clamps the zoom', () => {
      vi.useFakeTimers();
      const { fills } = createFakeContext();
      const { wheel } = setup('paint');
      for (let index = 0; index < 50; index++) wheel({ deltaY: -1000 });
      drawFrame(fills);
      expect(drawnZoom(fills)).toBe(2);
      for (let index = 0; index < 50; index++) wheel({ deltaY: 1000, ctrlKey: true });
      drawFrame(fills);
      expect(drawnZoom(fills)).toBe(0.5);
    });

    it('limits the zoom change of a single ctrl wheel event', () => {
      vi.useFakeTimers();
      expect(zoomAfterWheel({ deltaY: -100, ctrlKey: true })).toBeLessThanOrEqual(1.25 + 1e-9);
      expect(zoomAfterWheel({ deltaY: -2, ctrlKey: true })).toBeCloseTo(Math.exp(0.02), 1);
    });

    it('zooms faster on a trackpad pinch than on a plain wheel', () => {
      vi.useFakeTimers();
      const plain = zoomAfterWheel({ deltaY: -50 });
      expect(plain).toBeGreaterThan(1);
      expect(zoomAfterWheel({ deltaY: -50, ctrlKey: true })).toBeGreaterThan(plain);
    });

    it.each(['pending', 'drag'])('ignores the wheel during a %s long press', (phase) => {
      vi.useFakeTimers();
      const { fills } = createFakeContext();
      const { dispatch, wheel } = setup('edit');
      dispatch('pointerdown', at(0, 0));
      if (phase === 'drag') longPress();
      wheel({ ...at(0, 0), deltaY: -1000 });
      drawFrame(fills);
      expect(drawnZoom(fills)).toBe(1);
    });

    it('does not pan on wheel', () => {
      vi.useFakeTimers();
      const { fills } = createFakeContext();
      const { wheel } = setup('paint');
      wheel({ deltaX: 2 * GRID_CELL_STEP });
      wheel({ deltaY: 0, deltaX: GRID_CELL_STEP, shiftKey: true });
      drawFrame(fills);
      expect(topLeftColor(fills)).toBe('a');
      expect(drawnZoom(fills)).toBe(1);
    });

    it('zooms with a two-finger pinch anchored at the midpoint', () => {
      vi.useFakeTimers();
      const { callbacks, dispatch } = setup('paint');
      const touch = (type: string, pointerId: number, clientX: number) =>
        dispatch(type, { clientX, clientY: GRID_CELL_STEP, pointerType: 'touch', pointerId });
      touch('pointerdown', 1, GRID_CELL_STEP);
      touch('pointerdown', 2, 2 * GRID_CELL_STEP);
      touch('pointermove', 1, GRID_CELL_STEP / 2);
      touch('pointermove', 2, (5 * GRID_CELL_STEP) / 2);
      touch('pointerup', 1, GRID_CELL_STEP / 2);
      touch('pointerup', 2, (5 * GRID_CELL_STEP) / 2);
      dispatch('pointerdown', { clientX: 130, clientY: 100, pointerType: 'touch', pointerId: 3 });
      dispatch('pointerup', { clientX: 130, clientY: 100, pointerType: 'touch', pointerId: 3 });
      expect(callbacks.onPaint).toHaveBeenCalledOnce();
      expect(callbacks.onPaint).toHaveBeenCalledWith([{ row: 1, column: 2 }]);
    });
  });

  it('stops handling input after destroy', () => {
    const { callbacks, controller, dispatch, mouseDown } = setup('paint');
    spacePan(dispatch);
    controller.destroy();
    expect(press('keyup').defaultPrevented).toBe(false);
    press('keydown');
    dispatch('pointerdown', at(0, 0));
    dispatch('pointerup', at(0, 0));
    expect(callbacks.onPaint).not.toHaveBeenCalled();
    expect(mouseDown(1)).toBe(true);
  });

  it('removes the keyboard listeners on destroy', () => {
    const remove = vi.spyOn(globalThis, 'removeEventListener');
    const { controller } = setup('paint');
    controller.destroy();
    expect(remove.mock.calls.map(([type]) => type)).toEqual(expect.arrayContaining(['keydown', 'keyup', 'blur']));
  });
});

describe('rendering', () => {
  it('maps the backing store exactly at a fractional devicePixelRatio', () => {
    vi.useFakeTimers();
    vi.stubGlobal('devicePixelRatio', 1.5);
    const { fills, context } = createFakeContext();
    setup('paint', colors, new DOMRect(0, 0, 100.5, 50.5));
    drawFrame(fills);
    const scaleX = 151 / 100.5;
    const scaleY = 76 / 50.5;
    expect(context.setTransform).toHaveBeenLastCalledWith(scaleX, 0, 0, scaleY, 0, 0);
    expect(fills.length).toBeGreaterThan(0);
    expect(fills.every(({ x, y, size }) => isWhole(x * scaleX) && isWhole(y * scaleY) && isWhole(size * scaleX))).toBe(
      true,
    );
  });

  it('restores colors when the stroke is cancelled', () => {
    vi.useFakeTimers();
    const { fills } = createFakeContext();
    const { dispatch } = setup('paint');
    dispatch('pointerdown', { ...at(0, 0), pointerType: 'touch', pointerId: 1 });
    expect(drawFrame(fills)).toContain('x');
    dispatch('pointerdown', { ...at(2, 2), pointerType: 'touch', pointerId: 2 });
    expect(drawFrame(fills)).not.toContain('x');
  });

  it('moves the view with a two-finger pan', () => {
    vi.useFakeTimers();
    const { fills } = createFakeContext();
    const { dispatch } = setup('paint');
    drawFrame(fills);
    const before = firstRowColor(fills);
    dispatch('pointerdown', { ...at(0, 0), pointerType: 'touch', pointerId: 1 });
    dispatch('pointerdown', { ...at(0, 1), pointerType: 'touch', pointerId: 2 });
    dispatch('pointermove', { ...at(1, 0), pointerType: 'touch', pointerId: 1 });
    dispatch('pointermove', { ...at(1, 1), pointerType: 'touch', pointerId: 2 });
    drawFrame(fills);
    expect(before).toBe('a');
    expect(firstRowColor(fills)).toBe('c');
  });

  it('lands a wrapped row under the drop point', () => {
    vi.useFakeTimers();
    const { fills } = createFakeContext();
    const { callbacks, controller, dispatch } = setup('edit');
    const dropY = 3 * GRID_CELL_STEP + 7;
    const colorAt = (slot: number) => fills.find(({ y }) => y === slot * GRID_CELL_STEP)?.color;
    dispatch('pointerdown', at(0, 2));
    longPress();
    dispatch('pointermove', { clientX: 1, clientY: dropY });
    vi.advanceTimersByTime(2000);
    dispatch('pointerup', { clientX: 1, clientY: dropY });
    drawFrame(fills);
    expect([colorAt(1), colorAt(2)]).toEqual(['d', 'a']);
    const [from, to] = callbacks.onMoveRow.mock.calls[0] as [number, number];
    const moved = colors.toSpliced(from, 1).toSpliced(to, 0, colors[from] ?? []);
    controller.update({
      colors: moved,
      fades: [],
      heights: heightsOf(moved),
      mode: 'edit',
      activeRow: to,
      paintColor: 'x',
    });
    drawFrames(fills);
    expect(colorAt(3)).toBe('g');
    expect(colorAt(2)).toBe('a');
    expect(colorAt(1)).toBe('d');
  });

  it('keeps rows in place when a wrapped drop does not change the order', () => {
    vi.useFakeTimers();
    const { fills } = createFakeContext();
    const { callbacks, dispatch } = setup('edit');
    const dropY = 1 - 2 * GRID_CELL_STEP;
    dispatch('pointerdown', at(0, 0));
    longPress();
    dispatch('pointermove', { clientX: 1, clientY: dropY });
    vi.advanceTimersByTime(2000);
    dispatch('pointerup', { clientX: 1, clientY: dropY });
    drawFrame(fills);
    const colorAt = (slot: number) => fills.find(({ y }) => y === slot * GRID_CELL_STEP)?.color;
    expect(callbacks.onMoveRow).not.toHaveBeenCalled();
    expect([colorAt(0), colorAt(1), colorAt(2)]).toEqual(['g', 'a', 'd']);
  });

  it('outlines one copy of the active row in paint mode', () => {
    vi.useFakeTimers();
    const { fills, strokes } = createFakeContext();
    setup('paint');
    drawFrame(fills, strokes);
    expect(strokes.filter(({ lineWidth }) => lineWidth === 2)).toEqual([
      { lineWidth: 2, x: -GRID_CELL_GAP / 2, y: -GRID_CELL_GAP / 2, width: 3 * GRID_CELL_STEP },
    ]);
  });

  it('outlines the tapped copy and keeps its blocks when the active row changes', () => {
    vi.useFakeTimers();
    const { fills, strokes } = createFakeContext();
    const { callbacks, controller, dispatch } = setup('edit');
    dispatch('pointerdown', at(3, 1));
    dispatch('pointerup', at(3, 1));
    expect(callbacks.onSelectRow).toHaveBeenCalledWith(1);
    controller.update({ colors, fades: [], heights: heightsOf(colors), mode: 'edit', activeRow: 1, paintColor: 'x' });
    drawFrame(fills, strokes);
    const x = 3 * GRID_CELL_STEP - GRID_CELL_GAP / 2;
    expect(outline(strokes)).toEqual({
      lineWidth: 2,
      x,
      y: GRID_CELL_STEP - GRID_CELL_GAP / 2,
      width: 3 * GRID_CELL_STEP,
    });
    controller.update({ colors, fades: [], heights: heightsOf(colors), mode: 'edit', activeRow: 2, paintColor: 'x' });
    drawFrame(fills, strokes);
    expect(outline(strokes)).toMatchObject({ x, y: 2 * GRID_CELL_STEP - GRID_CELL_GAP / 2 });
  });

  it('outlines the lifted copy on a long press', () => {
    vi.useFakeTimers();
    const { fills, strokes } = createFakeContext();
    const { dispatch } = setup('edit', colors.slice(0, 2));
    dispatch('pointerdown', at(1, 2));
    longPress();
    drawFrame(fills, strokes);
    expect(outline(strokes)).toMatchObject({ x: -GRID_CELL_GAP / 2, y: 2 * GRID_CELL_STEP - GRID_CELL_GAP / 2 });
  });

  it('keeps the outline on the dragged copy through a wrapped drop', () => {
    vi.useFakeTimers();
    const { fills, strokes } = createFakeContext();
    const { callbacks, controller, dispatch } = setup('edit');
    const dropX = 3 * GRID_CELL_STEP + 1;
    const dropY = 2 * GRID_CELL_STEP + 21;
    const box = () => outline(strokes) ?? { x: Number.NaN, y: Number.NaN };
    const underPointer = () => box().y <= dropY && dropY <= box().y + GRID_CELL_STEP;
    const outlined = () =>
      Math.abs(box().y - dropY) < GRID_CELL_STEP &&
      box().x === 3 * GRID_CELL_STEP - GRID_CELL_GAP / 2 &&
      fills.some(
        ({ color, x, y }) => color === 'g' && x - GRID_CELL_GAP / 2 === box().x && y - GRID_CELL_GAP / 2 === box().y,
      );
    dispatch('pointerdown', at(0, 2));
    longPress();
    controller.update({ colors, fades: [], heights: heightsOf(colors), mode: 'edit', activeRow: 2, paintColor: 'x' });
    dispatch('pointermove', { clientX: dropX, clientY: dropY });
    drawFrame(fills, strokes);
    expect([outlined(), underPointer()]).toEqual([true, true]);
    dispatch('pointerup', { clientX: dropX, clientY: dropY });
    drawFrame(fills, strokes);
    expect(outlined()).toBe(true);
    const [from, to] = callbacks.onMoveRow.mock.calls[0] as [number, number];
    const moved = colors.toSpliced(from, 1).toSpliced(to, 0, colors[from] ?? []);
    controller.update({
      colors: moved,
      fades: [],
      heights: heightsOf(moved),
      mode: 'edit',
      activeRow: to,
      paintColor: 'x',
    });
    const frames: boolean[] = [];
    while (vi.getTimerCount() > 0) {
      drawFrame(fills, strokes);
      frames.push(outlined());
    }
    expect(frames.length).toBeGreaterThan(0);
    expect(frames.every(Boolean)).toBe(true);
  });

  it('keeps a row dropped a whole block away under the pointer', () => {
    vi.useFakeTimers();
    const { fills } = createFakeContext();
    const { callbacks, dispatch } = setup('edit', colors.slice(0, 2));
    dispatch('pointerdown', at(0, 0));
    longPress();
    dispatch('pointermove', at(0, 2));
    dispatch('pointerup', at(0, 2));
    const frames = drawFrames(fills).map((frame) =>
      frame.some(({ color, y }) => color === 'a' && y === 2 * GRID_CELL_STEP),
    );
    expect(callbacks.onMoveRow).not.toHaveBeenCalled();
    expect(frames.length).toBeGreaterThan(0);
    expect(frames.every(Boolean)).toBe(true);
  });

  it('moves other rows at most one row per drag step across a block boundary', () => {
    vi.useFakeTimers();
    const { fills } = createFakeContext();
    const { dispatch } = setup('edit');
    const period = colors.length * GRID_CELL_STEP;
    const slotOf = (frame: typeof fills, color: string) =>
      mod(frame.find((fill) => fill.color === color)?.y ?? Number.NaN, period);
    const cyclicDistance = (a: number, b: number) => Math.min(mod(a - b, period), mod(b - a, period));
    dispatch('pointerdown', at(0, 0));
    longPress();
    let settled = drawFrames(fills).at(-1) ?? [];
    const jumps = [-1, -2, -3].flatMap((step) => {
      const before = settled;
      dispatch('pointermove', { clientX: 1, clientY: 1 + step * GRID_CELL_STEP });
      const frames = drawFrames(fills);
      settled = frames.at(-1) ?? [];
      return frames.flatMap((frame) =>
        ['d', 'g'].map((color) => cyclicDistance(slotOf(frame, color), slotOf(before, color))),
      );
    });
    expect(jumps.length).toBeGreaterThan(0);
    expect(Math.max(...jumps)).toBeLessThanOrEqual(GRID_CELL_STEP);
  });
});
