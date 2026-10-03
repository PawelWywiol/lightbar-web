# Scheme Editor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the single-frame 8×8 editor with a full-screen editor of the whole scheme: an infinite, repeating canvas grid where each row is a `LightsFrame` and each column is a light.

**Architecture:** Scheme edits are pure functions in `editor.utils.ts` feeding the existing undo history. A framework-free canvas controller (`schemeGrid.controller.ts`) owns drawing, panning, inertia, painting and row drag & drop; a thin React component wires it to the providers. A new `EditorGridProvider` (mode, active row, preview row) replaces `EditorFrameProvider`.

**Tech Stack:** React 19.3 (`useEffectEvent`), React Router 8 SPA, Tailwind 4, Canvas 2D, Vitest 5 + jsdom + Testing Library, oxlint/oxfmt, pnpm.

**Spec:** `docs/superpowers/specs/2026-10-02-scheme-editor-design.md`

## Global Constraints

- Work in `lightbar-web` on branch `feature/scheme-editor` (PR #8). Never merge the PR.
- Conventional commits, header max 70 chars, no AI attribution, no `Co-Authored-By`.
- No code comments unless a non-obvious business decision (one short line).
- oxfmt style: single quotes, trailing commas, semicolons, 2-space indent, 120 width. Run `pnpm fmt` before committing.
- Lights count range 1–255; device receives exactly `X` colors per frame (firmware repeats/trims).
- Data model `LightsScheme { name, frames[] }` stays unchanged.
- Gates before each commit: `pnpm typecheck && pnpm lint && pnpm test` (lefthook also runs fmt/lint on commit, typecheck/test on push).
- Single test file: `pnpm vitest <path> --run --coverage.enabled=false`.

## File Structure

| File | Responsibility |
| --- | --- |
| `components/editor/editor.config.tsx` | editor + grid constants |
| `components/editor/editor.types.ts` | `EditorMode`, `SchemeShiftDirection`, `GridCell` |
| `components/editor/editor.utils.ts` | pure scheme operations, color style |
| `components/editor/components/schemeGrid/schemeGrid.utils.ts` | pure grid geometry |
| `components/editor/components/schemeGrid/schemeGrid.draw.ts` | canvas drawing |
| `components/editor/components/schemeGrid/schemeGrid.controller.ts` | pointer/wheel gestures, inertia, render loop |
| `components/editor/components/schemeGrid/schemeGrid.tsx` | React glue to providers |
| `components/editor/providers/editorGrid.provider.tsx` | mode, active row, preview row |
| `components/editor/components/editorModeTools.tsx` | mode switch + lights count + mode bar |
| `components/editor/components/lightsCountTools.tsx` | −/value/+ lights count |
| `components/editor/components/editorRowTools.tsx` | type, tempo, add, clone, delete for active row |

Deleted: `editor.provider.tsx`, `editor.hooks.ts`, `providers/editorFrame.provider.tsx`, `components/lightsFrameGrid/`, `components/lightsFrameStateTools.tsx`, layout options in `lib/lights`, `resolveLightsSchemeColorIndexes` in `lib/devices/devices.utils.ts`.

---

### Task 1: Pure scheme operations

**Files:**
- Modify: `components/editor/editor.config.tsx`
- Modify: `components/editor/editor.types.ts`
- Modify: `components/editor/editor.utils.ts`
- Test: `components/editor/editor.utils.spec.ts`

**Interfaces:**
- Produces (in `editor.types.ts`):
  - `type EditorMode = 'paint' | 'edit'`
  - `type SchemeShiftDirection = 'up' | 'down' | 'left' | 'right'`
  - `interface GridCell { row: number; column: number }`
- Produces (in `editor.config.tsx`): `EDITOR_LIGHTS_COUNT_MIN = 1`, `EDITOR_LIGHTS_COUNT_MAX = 255`, `EDITOR_ROWS_MAX = Number.POSITIVE_INFINITY`
- Produces (in `editor.utils.ts`, all return a new `LightsScheme` unless noted):
  - `getLightsCount(scheme): number`
  - `clampLightsCount(value: number): number`
  - `resizeScheme(scheme, lightsCount: number)`
  - `normalizeScheme(scheme)`
  - `paintCells(scheme, cells: GridCell[], color: LightColor)`
  - `updateRow(scheme, row: number, patch: Partial<Pick<LightsFrame, 'type' | 'tempo'>>)`
  - `addRow(scheme, afterRow: number)`, `cloneRow(scheme, row: number)`, `deleteRow(scheme, row: number)`
  - `moveRow(scheme, from: number, to: number)`
  - `shiftRow(scheme, row: number, delta: number)`, `shuffleRow(scheme, row: number)`
  - `shiftScheme(scheme, direction: SchemeShiftDirection)`

- [ ] **Step 1: Add constants and types**

Append to `components/editor/editor.config.tsx`:

```ts
export const EDITOR_LIGHTS_COUNT_MIN = 1;
export const EDITOR_LIGHTS_COUNT_MAX = 255;
// Row limit will depend on device memory; unlimited for now.
export const EDITOR_ROWS_MAX = Number.POSITIVE_INFINITY;
```

Append to `components/editor/editor.types.ts`:

```ts
export type EditorMode = 'paint' | 'edit';

export type SchemeShiftDirection = 'up' | 'down' | 'left' | 'right';

export interface GridCell {
  row: number;
  column: number;
}
```

- [ ] **Step 2: Write the failing tests**

In `components/editor/editor.utils.spec.ts`:

1. Extend the imports:

```ts
import {
  DEFAULT_LIGHTS_FRAME_TEMPO,
  DEFAULT_LIGHTS_FRAME_TYPE,
  LIGHTS_BACKGROUND_COLOR,
} from '../../lib/lights/lights.config';
import type { LightColor, LightsScheme } from '../../lib/lights/lights.types';
import {
  addRow,
  clampLightsCount,
  cloneRow,
  deleteRow,
  getLightsCount,
  moveRow,
  normalizeScheme,
  paintCells,
  resizeScheme,
  resolveBinaryColorStyle,
  shiftColorsFrame,
  shiftRow,
  shiftScheme,
  shuffleRow,
  updateRow,
} from './editor.utils';
```

2. Add these helpers below `createTestFrame`:

```ts
const BG = LIGHTS_BACKGROUND_COLOR;

const createScheme = (rows: number[][]): LightsScheme => ({
  name: 'test',
  frames: rows.map((colors) => ({
    type: DEFAULT_LIGHTS_FRAME_TYPE,
    tempo: DEFAULT_LIGHTS_FRAME_TEMPO,
    colors: colors.map((color) => color as LightColor),
  })),
});

const colorsOf = (scheme: LightsScheme) => scheme.frames.map((frame) => frame.colors);
```

3. Add this `describe` block at the end of the outer `describe('editor.utils', ...)`:

```ts
  describe('scheme operations', () => {
    it('getLightsCount returns first row length or 0', () => {
      expect(getLightsCount(createScheme([[1, 2, 3]]))).toBe(3);
      expect(getLightsCount({ name: '', frames: [] })).toBe(0);
    });

    it('clampLightsCount clamps to 1..255 and truncates', () => {
      expect(clampLightsCount(0)).toBe(1);
      expect(clampLightsCount(300)).toBe(255);
      expect(clampLightsCount(7.9)).toBe(7);
    });

    it('resizeScheme trims and pads every row', () => {
      const scheme = createScheme([
        [1, 2, 3],
        [4, 5, 6],
      ]);
      expect(colorsOf(resizeScheme(scheme, 2))).toEqual([
        [1, 2],
        [4, 5],
      ]);
      expect(colorsOf(resizeScheme(scheme, 4))).toEqual([
        [1, 2, 3, BG],
        [4, 5, 6, BG],
      ]);
    });

    it('normalizeScheme aligns rows to the first row and keeps at least one light and row', () => {
      expect(colorsOf(normalizeScheme(createScheme([[1, 2], [3]])))).toEqual([
        [1, 2],
        [3, BG],
      ]);
      expect(colorsOf(normalizeScheme(createScheme([[]])))).toEqual([[BG]]);
      expect(colorsOf(normalizeScheme({ name: '', frames: [] }))).toEqual([[BG]]);
    });

    it('paintCells paints given cells and keeps untouched rows by reference', () => {
      const scheme = createScheme([
        [1, 2],
        [3, 4],
        [5, 6],
      ]);
      const result = paintCells(
        scheme,
        [
          { row: 0, column: 1 },
          { row: 1, column: 0 },
        ],
        9 as LightColor,
      );
      expect(colorsOf(result)).toEqual([
        [1, 9],
        [9, 4],
        [5, 6],
      ]);
      expect(result.frames[2]).toBe(scheme.frames[2]);
    });

    it('updateRow patches type and tempo of one row', () => {
      const result = updateRow(createScheme([[1], [2]]), 1, { tempo: 60 });
      expect(result.frames[1]?.tempo).toBe(60);
      expect(result.frames[0]?.tempo).toBe(DEFAULT_LIGHTS_FRAME_TEMPO);
    });

    it('addRow inserts a background row after the given row', () => {
      expect(
        colorsOf(
          addRow(
            createScheme([
              [1, 2],
              [3, 4],
            ]),
            0,
          ),
        ),
      ).toEqual([
        [1, 2],
        [BG, BG],
        [3, 4],
      ]);
    });

    it('cloneRow inserts a deep copy after the source row', () => {
      const result = cloneRow(
        createScheme([
          [1, 2],
          [3, 4],
        ]),
        0,
      );
      expect(colorsOf(result)).toEqual([
        [1, 2],
        [1, 2],
        [3, 4],
      ]);
      expect(result.frames[1]).not.toBe(result.frames[0]);
    });

    it('deleteRow removes a row but keeps the last one', () => {
      expect(
        colorsOf(
          deleteRow(
            createScheme([
              [1, 2],
              [3, 4],
            ]),
            0,
          ),
        ),
      ).toEqual([[3, 4]]);
      const single = createScheme([[1]]);
      expect(deleteRow(single, 0)).toBe(single);
    });

    it('moveRow moves a row to the target index', () => {
      const scheme = createScheme([[1], [2], [3]]);
      expect(colorsOf(moveRow(scheme, 0, 2))).toEqual([[2], [3], [1]]);
      expect(colorsOf(moveRow(scheme, 2, 0))).toEqual([[3], [1], [2]]);
    });

    it('shiftRow rotates one row with wrapping in both directions', () => {
      const scheme = createScheme([
        [1, 2, 3],
        [4, 5, 6],
      ]);
      expect(colorsOf(shiftRow(scheme, 0, 1))).toEqual([
        [3, 1, 2],
        [4, 5, 6],
      ]);
      expect(colorsOf(shiftRow(scheme, 0, -1))[0]).toEqual([2, 3, 1]);
      expect(colorsOf(shiftRow(scheme, 0, 4))[0]).toEqual([3, 1, 2]);
      expect(colorsOf(shiftRow(scheme, 0, -4))[0]).toEqual([2, 3, 1]);
    });

    it('shiftScheme rotates rows up/down and all columns left/right', () => {
      expect(colorsOf(shiftScheme(createScheme([[1], [2], [3]]), 'up'))).toEqual([[2], [3], [1]]);
      expect(colorsOf(shiftScheme(createScheme([[1], [2], [3]]), 'down'))).toEqual([[3], [1], [2]]);
      const scheme = createScheme([
        [1, 2, 3],
        [4, 5, 6],
      ]);
      expect(colorsOf(shiftScheme(scheme, 'left'))).toEqual([
        [2, 3, 1],
        [5, 6, 4],
      ]);
      expect(colorsOf(shiftScheme(scheme, 'right'))).toEqual([
        [3, 1, 2],
        [6, 4, 5],
      ]);
    });

    it('shuffleRow keeps the color multiset and other rows', () => {
      const scheme = createScheme([
        [1, 2, 3, 4, 5],
        [6, 7],
      ]);
      const result = shuffleRow(scheme, 0);
      expect([...(result.frames[0]?.colors ?? [])].sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5]);
      expect(result.frames[1]).toBe(scheme.frames[1]);
    });
  });
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `pnpm vitest components/editor/editor.utils.spec.ts --run --coverage.enabled=false`
Expected: FAIL. The new imports (`addRow`, `getLightsCount`, ...) are not exported.

- [ ] **Step 4: Implement the operations**

In `components/editor/editor.utils.ts`, replace the imports block with:

```ts
import {
  DEFAULT_LIGHTS_FRAME_TEMPO,
  DEFAULT_LIGHTS_FRAME_TYPE,
  LIGHTS_BACKGROUND_COLOR,
  LIGHTS_PALLETTE_HUE_MASK,
  LIGHTS_PALLETTE_HUE_MAX,
  LIGHTS_PALLETTE_LIGHTNESS_BASE,
  LIGHTS_PALLETTE_LIGHTNESS_MASK,
  LIGHTS_PALLETTE_LIGHTNESS_STEP,
} from '../../lib/lights/lights.config';
import type { LightColor, LightsFrame, LightsLayoutOption, LightsScheme } from '../../lib/lights/lights.types';
import { secureRandomNumber } from '../../lib/utils/uid/uid';
import { EDITOR_LIGHTS_COUNT_MAX, EDITOR_LIGHTS_COUNT_MIN } from './editor.config';
import type { GridCell, SchemeShiftDirection, ShiftColorsFrame, ShiftDirection } from './editor.types';
```

Append to the end of the file:

```ts
const rotate = <T>(items: T[], delta: number): T[] => {
  const length = items.length;
  if (length === 0) return items;
  const split = length - (((delta % length) + length) % length);
  return [...items.slice(split), ...items.slice(0, split)];
};

const shuffle = <T>(items: T[]): T[] => {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index--) {
    const target = secureRandomNumber(index + 1);
    const current = result[index] as T;
    result[index] = result[target] as T;
    result[target] = current;
  }
  return result;
};

const resizeColors = (colors: LightColor[], length: number): LightColor[] =>
  Array.from({ length }, (_, index) => colors[index] ?? LIGHTS_BACKGROUND_COLOR);

const createFrame = (lightsCount: number): LightsFrame => ({
  type: DEFAULT_LIGHTS_FRAME_TYPE,
  tempo: DEFAULT_LIGHTS_FRAME_TEMPO,
  colors: resizeColors([], lightsCount),
});

const withFrames = (scheme: LightsScheme, frames: LightsFrame[]): LightsScheme => ({ ...scheme, frames });

const updateFrame = (scheme: LightsScheme, row: number, update: (frame: LightsFrame) => LightsFrame): LightsScheme =>
  withFrames(
    scheme,
    scheme.frames.map((frame, index) => (index === row ? update(frame) : frame)),
  );

const shiftColumns = (scheme: LightsScheme, delta: number): LightsScheme =>
  withFrames(
    scheme,
    scheme.frames.map((frame) => ({ ...frame, colors: rotate(frame.colors, delta) })),
  );

export const getLightsCount = (scheme: LightsScheme): number => scheme.frames[0]?.colors.length ?? 0;

export const clampLightsCount = (value: number): number =>
  Math.min(EDITOR_LIGHTS_COUNT_MAX, Math.max(EDITOR_LIGHTS_COUNT_MIN, Math.trunc(value)));

export const resizeScheme = (scheme: LightsScheme, lightsCount: number): LightsScheme =>
  withFrames(
    scheme,
    scheme.frames.map((frame) => ({ ...frame, colors: resizeColors(frame.colors, lightsCount) })),
  );

export const normalizeScheme = (scheme: LightsScheme): LightsScheme => {
  const lightsCount = clampLightsCount(getLightsCount(scheme));
  const frames = scheme.frames.length > 0 ? scheme.frames : [createFrame(lightsCount)];
  return resizeScheme(withFrames(scheme, frames), lightsCount);
};

export const paintCells = (scheme: LightsScheme, cells: GridCell[], color: LightColor): LightsScheme =>
  withFrames(
    scheme,
    scheme.frames.map((frame, row) => {
      const columns = new Set(cells.filter((cell) => cell.row === row).map((cell) => cell.column));
      if (columns.size === 0) return frame;
      return { ...frame, colors: frame.colors.map((current, column) => (columns.has(column) ? color : current)) };
    }),
  );

export const updateRow = (
  scheme: LightsScheme,
  row: number,
  patch: Partial<Pick<LightsFrame, 'type' | 'tempo'>>,
): LightsScheme => updateFrame(scheme, row, (frame) => ({ ...frame, ...patch }));

export const addRow = (scheme: LightsScheme, afterRow: number): LightsScheme =>
  withFrames(scheme, scheme.frames.toSpliced(afterRow + 1, 0, createFrame(getLightsCount(scheme))));

export const cloneRow = (scheme: LightsScheme, row: number): LightsScheme => {
  const frame = scheme.frames[row];
  return frame ? withFrames(scheme, scheme.frames.toSpliced(row + 1, 0, structuredClone(frame))) : scheme;
};

export const deleteRow = (scheme: LightsScheme, row: number): LightsScheme =>
  scheme.frames.length > 1 ? withFrames(scheme, scheme.frames.toSpliced(row, 1)) : scheme;

export const moveRow = (scheme: LightsScheme, from: number, to: number): LightsScheme => {
  const frame = scheme.frames[from];
  return frame ? withFrames(scheme, scheme.frames.toSpliced(from, 1).toSpliced(to, 0, frame)) : scheme;
};

export const shiftRow = (scheme: LightsScheme, row: number, delta: number): LightsScheme =>
  updateFrame(scheme, row, (frame) => ({ ...frame, colors: rotate(frame.colors, delta) }));

export const shuffleRow = (scheme: LightsScheme, row: number): LightsScheme =>
  updateFrame(scheme, row, (frame) => ({ ...frame, colors: shuffle(frame.colors) }));

export const shiftScheme = (scheme: LightsScheme, direction: SchemeShiftDirection): LightsScheme => {
  if (direction === 'up') return withFrames(scheme, rotate(scheme.frames, -1));
  if (direction === 'down') return withFrames(scheme, rotate(scheme.frames, 1));
  return shiftColumns(scheme, direction === 'left' ? -1 : 1);
};
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm vitest components/editor/editor.utils.spec.ts --run --coverage.enabled=false`
Expected: PASS (old and new tests).

- [ ] **Step 6: Gates and commit**

```bash
pnpm fmt && pnpm typecheck && pnpm lint && pnpm test
git add components/editor/editor.config.tsx components/editor/editor.types.ts components/editor/editor.utils.ts components/editor/editor.utils.spec.ts
git commit -m "feat: add pure scheme operations for row based editor"
```

---

### Task 2: Grid geometry

**Files:**
- Modify: `components/editor/editor.config.tsx`
- Create: `components/editor/components/schemeGrid/schemeGrid.utils.ts`
- Test: `components/editor/components/schemeGrid/schemeGrid.utils.spec.ts`

**Interfaces:**
- Consumes: `GridCell` (Task 1)
- Produces (config): `GRID_CELL_SIZE = 32`, `GRID_CELL_GAP = 4`, `GRID_CELL_STEP = 36`, `GRID_CELL_RADIUS = 4`, `GRID_PAN_THRESHOLD = 6`, `GRID_LONG_PRESS_MS = 300`, `GRID_FRICTION = 0.95`, `GRID_MIN_VELOCITY = 0.01`, `GRID_VELOCITY_TIMEOUT_MS = 50`, `GRID_ROW_ANIMATION_SPEED = 0.25`
- Produces (utils):
  - `interface GridPoint { x: number; y: number }`
  - `interface GridSize { rows: number; columns: number }`
  - `mod(value: number, size: number): number`
  - `resolveBaseCell(point: GridPoint, offset: GridPoint, size: GridSize): GridCell`
  - `resolveVisibleRange(offset: number, length: number): { start: number; end: number }` (end exclusive)
  - `resolveDropRow(fromRow: number, deltaY: number, rows: number): number`
  - `resolveRowSlots(rows: number, fromRow: number, toRow: number): number[]` (index = base row, value = visual slot)
  - `applyFriction(velocity: number, elapsed: number): number`

- [ ] **Step 1: Add grid constants**

Append to `components/editor/editor.config.tsx`:

```ts
export const GRID_CELL_SIZE = 32;
export const GRID_CELL_GAP = 4;
export const GRID_CELL_STEP = GRID_CELL_SIZE + GRID_CELL_GAP;
export const GRID_CELL_RADIUS = 4;
export const GRID_PAN_THRESHOLD = 6;
export const GRID_LONG_PRESS_MS = 300;
export const GRID_FRICTION = 0.95;
export const GRID_MIN_VELOCITY = 0.01;
export const GRID_VELOCITY_TIMEOUT_MS = 50;
export const GRID_ROW_ANIMATION_SPEED = 0.25;
```

- [ ] **Step 2: Write the failing tests**

Create `components/editor/components/schemeGrid/schemeGrid.utils.spec.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { GRID_CELL_STEP } from '../../editor.config';
import {
  applyFriction,
  mod,
  resolveBaseCell,
  resolveDropRow,
  resolveRowSlots,
  resolveVisibleRange,
} from './schemeGrid.utils';

describe('schemeGrid.utils', () => {
  it('mod always returns a non-negative remainder', () => {
    expect(mod(4, 3)).toBe(1);
    expect(mod(-1, 3)).toBe(2);
    expect(mod(-3, 3)).toBe(0);
  });

  it('resolveBaseCell maps any repeated copy to its base cell', () => {
    const size = { rows: 3, columns: 2 };
    expect(resolveBaseCell({ x: 1, y: 1 }, { x: 0, y: 0 }, size)).toEqual({ row: 0, column: 0 });
    expect(resolveBaseCell({ x: 3 * GRID_CELL_STEP + 1, y: 4 * GRID_CELL_STEP + 1 }, { x: 0, y: 0 }, size)).toEqual({
      row: 1,
      column: 1,
    });
    expect(resolveBaseCell({ x: 0, y: 0 }, { x: -1, y: -GRID_CELL_STEP - 1 }, size)).toEqual({ row: 1, column: 1 });
  });

  it('resolveVisibleRange covers partially visible cells', () => {
    expect(resolveVisibleRange(0, 100)).toEqual({ start: 0, end: 3 });
    expect(resolveVisibleRange(-10, GRID_CELL_STEP)).toEqual({ start: -1, end: 1 });
  });

  it('resolveDropRow rounds the delta and clamps to existing rows', () => {
    expect(resolveDropRow(1, 40, 3)).toBe(2);
    expect(resolveDropRow(1, 10, 3)).toBe(1);
    expect(resolveDropRow(1, 500, 3)).toBe(2);
    expect(resolveDropRow(1, -500, 3)).toBe(0);
  });

  it('resolveRowSlots returns visual slot of each base row after a move', () => {
    expect(resolveRowSlots(3, 0, 2)).toEqual([2, 0, 1]);
    expect(resolveRowSlots(3, 2, 0)).toEqual([1, 2, 0]);
    expect(resolveRowSlots(3, 1, 1)).toEqual([0, 1, 2]);
  });

  it('applyFriction decays velocity proportionally to elapsed time', () => {
    expect(applyFriction(1, 16)).toBeCloseTo(0.95);
    expect(applyFriction(1, 32)).toBeCloseTo(0.9025);
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `pnpm vitest components/editor/components/schemeGrid/schemeGrid.utils.spec.ts --run --coverage.enabled=false`
Expected: FAIL, the module `./schemeGrid.utils` can't be resolved.

- [ ] **Step 4: Implement**

Create `components/editor/components/schemeGrid/schemeGrid.utils.ts`:

```ts
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
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm vitest components/editor/components/schemeGrid/schemeGrid.utils.spec.ts --run --coverage.enabled=false`
Expected: PASS.

- [ ] **Step 6: Gates and commit**

```bash
pnpm fmt && pnpm typecheck && pnpm lint && pnpm test
git add components/editor/editor.config.tsx components/editor/components/schemeGrid
git commit -m "feat: add infinite grid geometry helpers"
```

---

### Task 3: Canvas drawing and gesture controller

**Files:**
- Create: `components/editor/components/schemeGrid/schemeGrid.draw.ts`
- Create: `components/editor/components/schemeGrid/schemeGrid.controller.ts`
- Test: `components/editor/components/schemeGrid/schemeGrid.controller.spec.ts`

**Interfaces:**
- Consumes: Task 2 utils + constants, `EditorMode`, `GridCell`
- Produces:
  - `drawGrid(context: CanvasRenderingContext2D, state: GridDrawState): void`
  - `interface GridControllerProps { colors: string[][]; mode: EditorMode; activeRow: number; paintColor: string }`
  - `interface GridControllerCallbacks { onPaint(cells: GridCell[]): void; onSelectRow(row: number): void; onMoveRow(from: number, to: number): void }`
  - `interface GridController { update(props: GridControllerProps): void; destroy(): void }`
  - `createGridController(canvas: HTMLCanvasElement, callbacks: GridControllerCallbacks): GridController`

Behavior:
- Paint mode: 1 pointer paints a stroke (locally, interpolated between moves) and emits `onPaint(cells)` once on release. A 2nd pointer cancels the stroke and starts a 2-finger pan.
- Edit mode: tap emits `onSelectRow`.
  - Touch: a move past the threshold pans; holding 300 ms lifts the row.
  - Mouse: a move past the threshold lifts the row.
  - A lifted row emits `onSelectRow(row)`, follows the pointer, and on drop emits `onMoveRow(from, to)` if `to !== from`.
- Wheel pans in both axes (Shift switches to horizontal). Pan release keeps inertia.

- [ ] **Step 1: Write the failing tests**

Create `components/editor/components/schemeGrid/schemeGrid.controller.spec.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GRID_CELL_STEP, GRID_LONG_PRESS_MS } from '../../editor.config';
import type { EditorMode } from '../../editor.types';
import type { GridController } from './schemeGrid.controller';
import { createGridController } from './schemeGrid.controller';

const colors = [
  ['a', 'b', 'c'],
  ['d', 'e', 'f'],
  ['g', 'h', 'i'],
];

const at = (column: number, row: number) => ({
  clientX: column * GRID_CELL_STEP + 1,
  clientY: row * GRID_CELL_STEP + 1,
});

const controllers: GridController[] = [];

const setup = (mode: EditorMode) => {
  const canvas = document.createElement('canvas');
  canvas.setPointerCapture = vi.fn();
  const callbacks = { onPaint: vi.fn(), onSelectRow: vi.fn(), onMoveRow: vi.fn() };
  const controller = createGridController(canvas, callbacks);
  controller.update({ colors, mode, activeRow: 0, paintColor: 'x' });
  controllers.push(controller);
  const dispatch = (type: string, init: PointerEventInit) =>
    canvas.dispatchEvent(new PointerEvent(type, { bubbles: true, button: 0, pointerType: 'mouse', pointerId: 1, ...init }));
  return { callbacks, dispatch };
};

beforeEach(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe = vi.fn();
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

describe('createGridController', () => {
  describe('paint mode', () => {
    it('paints the clicked base cell', () => {
      const { callbacks, dispatch } = setup('paint');
      dispatch('pointerdown', at(1, 0));
      dispatch('pointerup', at(1, 0));
      expect(callbacks.onPaint).toHaveBeenCalledWith([{ row: 0, column: 1 }]);
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
  });

  describe('edit mode', () => {
    it('selects the base row on tap', () => {
      const { callbacks, dispatch } = setup('edit');
      dispatch('pointerdown', at(0, 4));
      dispatch('pointerup', at(0, 4));
      expect(callbacks.onSelectRow).toHaveBeenCalledWith(1);
      expect(callbacks.onMoveRow).not.toHaveBeenCalled();
    });

    it('moves a row dragged with the mouse', () => {
      const { callbacks, dispatch } = setup('edit');
      dispatch('pointerdown', at(0, 0));
      dispatch('pointermove', at(0, 2));
      dispatch('pointerup', at(0, 2));
      expect(callbacks.onSelectRow).toHaveBeenCalledWith(0);
      expect(callbacks.onMoveRow).toHaveBeenCalledWith(0, 2);
    });

    it('moves a row after a touch long press', () => {
      vi.useFakeTimers();
      const { callbacks, dispatch } = setup('edit');
      dispatch('pointerdown', { ...at(0, 0), pointerType: 'touch' });
      vi.advanceTimersByTime(GRID_LONG_PRESS_MS);
      dispatch('pointermove', { ...at(0, 2), pointerType: 'touch' });
      dispatch('pointerup', { ...at(0, 2), pointerType: 'touch' });
      expect(callbacks.onMoveRow).toHaveBeenCalledWith(0, 2);
    });

    it('pans instead of dragging when touch moves before the long press', () => {
      vi.useFakeTimers();
      const { callbacks, dispatch } = setup('edit');
      dispatch('pointerdown', { ...at(0, 0), pointerType: 'touch' });
      dispatch('pointermove', { ...at(0, 2), pointerType: 'touch' });
      vi.advanceTimersByTime(GRID_LONG_PRESS_MS);
      dispatch('pointerup', { ...at(0, 2), pointerType: 'touch' });
      expect(callbacks.onMoveRow).not.toHaveBeenCalled();
      expect(callbacks.onSelectRow).not.toHaveBeenCalled();
    });

    it('does not move a row dropped on its own slot', () => {
      const { callbacks, dispatch } = setup('edit');
      dispatch('pointerdown', at(0, 1));
      dispatch('pointermove', { clientX: 1, clientY: GRID_CELL_STEP + 12 });
      dispatch('pointerup', { clientX: 1, clientY: GRID_CELL_STEP + 12 });
      expect(callbacks.onMoveRow).not.toHaveBeenCalled();
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest components/editor/components/schemeGrid/schemeGrid.controller.spec.ts --run --coverage.enabled=false`
Expected: FAIL, the module `./schemeGrid.controller` can't be resolved.

- [ ] **Step 3: Implement drawing**

Create `components/editor/components/schemeGrid/schemeGrid.draw.ts`:

```ts
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
```

- [ ] **Step 4: Implement the controller**

Create `components/editor/components/schemeGrid/schemeGrid.controller.ts`:

```ts
import {
  GRID_CELL_STEP,
  GRID_LONG_PRESS_MS,
  GRID_MIN_VELOCITY,
  GRID_PAN_THRESHOLD,
  GRID_ROW_ANIMATION_SPEED,
  GRID_VELOCITY_TIMEOUT_MS,
} from '../../editor.config';
import type { EditorMode, GridCell } from '../../editor.types';
import { drawGrid } from './schemeGrid.draw';
import type { GridPoint } from './schemeGrid.utils';
import { applyFriction, resolveBaseCell, resolveDropRow, resolveRowSlots } from './schemeGrid.utils';

export interface GridControllerProps {
  colors: string[][];
  mode: EditorMode;
  activeRow: number;
  paintColor: string;
}

export interface GridControllerCallbacks {
  onPaint: (cells: GridCell[]) => void;
  onSelectRow: (row: number) => void;
  onMoveRow: (from: number, to: number) => void;
}

export interface GridController {
  update: (props: GridControllerProps) => void;
  destroy: () => void;
}

type Gesture =
  | { kind: 'idle' }
  | { kind: 'pending'; start: GridPoint; pointerType: string; timer: ReturnType<typeof setTimeout> | undefined }
  | { kind: 'paint'; last: GridPoint; cells: GridCell[] }
  | { kind: 'pan'; last: GridPoint; time: number; velocity: GridPoint }
  | { kind: 'drag'; row: number; startY: number };

const ZERO: GridPoint = { x: 0, y: 0 };

const identity = (length: number): number[] => Array.from({ length }, (_, index) => index);

const distance = (a: GridPoint, b: GridPoint): number => Math.hypot(a.x - b.x, a.y - b.y);

const midpoint = (points: GridPoint[]): GridPoint => ({
  x: points.reduce((sum, point) => sum + point.x, 0) / points.length,
  y: points.reduce((sum, point) => sum + point.y, 0) / points.length,
});

export const createGridController = (
  canvas: HTMLCanvasElement,
  callbacks: GridControllerCallbacks,
): GridController => {
  const context = canvas.getContext('2d');
  const pointers = new Map<number, GridPoint>();
  const offset: GridPoint = { x: 0, y: 0 };
  let props: GridControllerProps = { colors: [], mode: 'paint', activeRow: 0, paintColor: '' };
  let colors: string[][] = [];
  let rowPositions: number[] = [];
  let rowTargets: number[] = [];
  let landing: { row: number; position: number } | null = null;
  let drag: { row: number; deltaY: number } | null = null;
  let velocity: GridPoint = ZERO;
  let gesture: Gesture = { kind: 'idle' };
  let size = { width: 0, height: 0 };
  let outlineColor = '';
  let frameId = 0;
  let lastFrameTime = 0;

  const gridSize = () => ({ rows: colors.length, columns: colors[0]?.length ?? 1 });

  const toPoint = (event: MouseEvent): GridPoint => {
    const rect = canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  const animateInertia = (elapsed: number): boolean => {
    if (gesture.kind === 'pan') return false;
    if (Math.abs(velocity.x) < GRID_MIN_VELOCITY && Math.abs(velocity.y) < GRID_MIN_VELOCITY) return false;
    offset.x -= velocity.x * elapsed;
    offset.y -= velocity.y * elapsed;
    velocity = { x: applyFriction(velocity.x, elapsed), y: applyFriction(velocity.y, elapsed) };
    return true;
  };

  const animateRows = (): boolean => {
    let moving = false;
    rowPositions = rowPositions.map((position, row) => {
      const target = rowTargets[row] ?? row;
      const next = position + (target - position) * GRID_ROW_ANIMATION_SPEED;
      if (Math.abs(target - next) < 0.01) return target;
      moving = true;
      return next;
    });
    return moving;
  };

  const render = (time: number) => {
    frameId = 0;
    const elapsed = lastFrameTime ? time - lastFrameTime : 16;
    const moving = [animateInertia(elapsed), animateRows()].includes(true);
    if (context) {
      drawGrid(context, {
        ...size,
        offset,
        colors,
        rowPositions,
        activeRow: props.mode === 'edit' ? props.activeRow : -1,
        drag,
        outlineColor,
      });
    }
    lastFrameTime = moving ? time : 0;
    if (moving) requestDraw();
  };

  const requestDraw = () => {
    if (!frameId) frameId = requestAnimationFrame(render);
  };

  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    const ratio = globalThis.devicePixelRatio || 1;
    size = { width: rect.width, height: rect.height };
    canvas.width = Math.round(rect.width * ratio);
    canvas.height = Math.round(rect.height * ratio);
    context?.setTransform(ratio, 0, 0, ratio, 0, 0);
    outlineColor = getComputedStyle(canvas).color;
    requestDraw();
  };

  const resetRows = () => {
    rowPositions = identity(colors.length);
    rowTargets = identity(colors.length);
  };

  const clearPending = () => {
    if (gesture.kind === 'pending') clearTimeout(gesture.timer);
  };

  const cancelPaint = () => {
    colors = props.colors.map((row) => [...row]);
    requestDraw();
  };

  const paintAt = (cells: GridCell[], point: GridPoint) => {
    const cell = resolveBaseCell(point, offset, gridSize());
    if (cells.some((item) => item.row === cell.row && item.column === cell.column)) return;
    cells.push(cell);
    const row = colors[cell.row];
    if (row) row[cell.column] = props.paintColor;
  };

  const paintTo = (point: GridPoint) => {
    if (gesture.kind !== 'paint') return;
    const { last, cells } = gesture;
    const steps = Math.max(1, Math.ceil(distance(last, point) / (GRID_CELL_STEP / 2)));
    for (let step = 1; step <= steps; step++) {
      paintAt(cells, {
        x: last.x + ((point.x - last.x) * step) / steps,
        y: last.y + ((point.y - last.y) * step) / steps,
      });
    }
    gesture.last = point;
    requestDraw();
  };

  const startPan = (point: GridPoint) => {
    clearPending();
    gesture = { kind: 'pan', last: point, time: performance.now(), velocity: ZERO };
  };

  const panTo = (point: GridPoint) => {
    if (gesture.kind !== 'pan') return;
    const now = performance.now();
    const elapsed = Math.max(1, now - gesture.time);
    const delta = { x: point.x - gesture.last.x, y: point.y - gesture.last.y };
    offset.x -= delta.x;
    offset.y -= delta.y;
    gesture = { kind: 'pan', last: point, time: now, velocity: { x: delta.x / elapsed, y: delta.y / elapsed } };
    requestDraw();
  };

  const startDrag = (row: number, startY: number) => {
    gesture = { kind: 'drag', row, startY };
    drag = { row, deltaY: 0 };
    resetRows();
    callbacks.onSelectRow(row);
    requestDraw();
  };

  const moveDrag = (point: GridPoint) => {
    if (gesture.kind !== 'drag') return;
    const deltaY = point.y - gesture.startY;
    drag = { row: gesture.row, deltaY };
    rowTargets = resolveRowSlots(colors.length, gesture.row, resolveDropRow(gesture.row, deltaY, colors.length));
    requestDraw();
  };

  const finishDrag = (row: number, cancelled: boolean) => {
    const deltaY = drag?.deltaY ?? 0;
    const target = cancelled ? row : resolveDropRow(row, deltaY, colors.length);
    const position = row + deltaY / GRID_CELL_STEP;
    drag = null;
    rowTargets = identity(colors.length);
    rowPositions[row] = position;
    requestDraw();
    if (target === row) return;
    landing = { row: target, position };
    callbacks.onMoveRow(row, target);
  };

  const resolvePending = (point: GridPoint) => {
    if (gesture.kind !== 'pending' || distance(gesture.start, point) < GRID_PAN_THRESHOLD) return;
    if (gesture.pointerType !== 'mouse') {
      startPan(point);
      return;
    }
    const { start } = gesture;
    startDrag(resolveBaseCell(start, offset, gridSize()).row, start.y);
    moveDrag(point);
  };

  const finishGesture = (point: GridPoint, cancelled: boolean) => {
    const current = gesture;
    gesture = { kind: 'idle' };
    if (current.kind === 'paint') {
      if (cancelled) cancelPaint();
      else if (current.cells.length > 0) callbacks.onPaint(current.cells);
    }
    if (current.kind === 'pending') {
      clearTimeout(current.timer);
      if (!cancelled) callbacks.onSelectRow(resolveBaseCell(point, offset, gridSize()).row);
    }
    if (current.kind === 'drag') finishDrag(current.row, cancelled);
  };

  const onPointerDown = (event: PointerEvent) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    canvas.setPointerCapture(event.pointerId);
    const point = toPoint(event);
    pointers.set(event.pointerId, point);
    velocity = ZERO;

    if (pointers.size === 2 && gesture.kind !== 'drag') {
      if (gesture.kind === 'paint') cancelPaint();
      startPan(midpoint([...pointers.values()]));
      return;
    }
    if (pointers.size > 1) return;

    if (props.mode === 'paint') {
      gesture = { kind: 'paint', last: point, cells: [] };
      paintAt(gesture.cells, point);
      requestDraw();
      return;
    }

    const { row } = resolveBaseCell(point, offset, gridSize());
    gesture = {
      kind: 'pending',
      start: point,
      pointerType: event.pointerType,
      timer:
        event.pointerType === 'mouse' ? undefined : setTimeout(() => startDrag(row, point.y), GRID_LONG_PRESS_MS),
    };
  };

  const onPointerMove = (event: PointerEvent) => {
    if (!pointers.has(event.pointerId)) return;
    const point = toPoint(event);
    pointers.set(event.pointerId, point);
    if (gesture.kind === 'paint') paintTo(point);
    if (gesture.kind === 'pan') panTo(midpoint([...pointers.values()]));
    if (gesture.kind === 'drag') moveDrag(point);
    if (gesture.kind === 'pending') resolvePending(point);
  };

  const onPointerEnd = (event: PointerEvent) => {
    if (!pointers.delete(event.pointerId)) return;
    if (gesture.kind === 'pan') {
      const remaining = [...pointers.values()];
      if (remaining.length > 0) {
        gesture = { ...gesture, last: midpoint(remaining) };
        return;
      }
      velocity = performance.now() - gesture.time < GRID_VELOCITY_TIMEOUT_MS ? gesture.velocity : ZERO;
      gesture = { kind: 'idle' };
      requestDraw();
      return;
    }
    if (pointers.size > 0) return;
    finishGesture(toPoint(event), event.type === 'pointercancel');
  };

  const onWheel = (event: WheelEvent) => {
    event.preventDefault();
    const scale = event.deltaMode === WheelEvent.DOM_DELTA_LINE ? GRID_CELL_STEP : 1;
    velocity = ZERO;
    offset.x += (event.shiftKey ? event.deltaY : event.deltaX) * scale;
    offset.y += (event.shiftKey ? 0 : event.deltaY) * scale;
    requestDraw();
  };

  const preventDefault = (event: Event) => event.preventDefault();

  const update = (next: GridControllerProps) => {
    if (next.colors !== props.colors) {
      colors = next.colors.map((row) => [...row]);
      resetRows();
      if (landing && landing.row < colors.length) rowPositions[landing.row] = landing.position;
      landing = null;
    }
    props = next;
    requestDraw();
  };

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(canvas);
  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerEnd);
  canvas.addEventListener('pointercancel', onPointerEnd);
  canvas.addEventListener('wheel', onWheel, { passive: false });
  canvas.addEventListener('contextmenu', preventDefault);

  return {
    update,
    destroy: () => {
      clearPending();
      cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerEnd);
      canvas.removeEventListener('pointercancel', onPointerEnd);
      canvas.removeEventListener('wheel', onWheel);
      canvas.removeEventListener('contextmenu', preventDefault);
    },
  };
};
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm vitest components/editor/components/schemeGrid --run --coverage.enabled=false`
Expected: PASS (utils + controller).
- If `PointerEvent` init ignores `pointerType` or `pointerId` in this jsdom version, stop and report it. Do not change production code to fit the test.

- [ ] **Step 6: Gates and commit**

```bash
pnpm fmt && pnpm typecheck && pnpm lint && pnpm test
git add components/editor/components/schemeGrid
git commit -m "feat: add canvas grid controller with paint, pan and row drag"
```

---

### Task 4: Scheme provider: normalize, fix undo, raw save

**Context:** Today's undo is off by one. `history` starts empty, so after the first `handleUpdate` the history is `[A]` with index 1, and undo restores `A`, the current scheme. The fix is to seed the history with the initial scheme.

**Files:**
- Modify: `components/editor/providers/editorScheme.provider.tsx`
- Modify: `components/editor/editor.provider.tsx` (facade `handleSave` line)
- Test: `components/editor/providers/editorScheme.provider.spec.tsx`

**Interfaces:**
- Consumes: `normalizeScheme` (Task 1)
- Produces: `useEditorScheme().handleSave: () => void` (no args), which dispatches `app:save:scheme` with the raw scheme.

- [ ] **Step 1: Write the failing tests**

Create `components/editor/providers/editorScheme.provider.spec.tsx`:

```tsx
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { SaveSchemeDeviceEvent } from '../../../lib/devices/devicesEvents';
import {
  createLightColor,
  DEFAULT_LIGHTS_FRAME_TEMPO,
  DEFAULT_LIGHTS_FRAME_TYPE,
} from '../../../lib/lights/lights.config';
import type { LightsSchemeData } from '../../../lib/lights/lights.types';
import { EditorSchemeProvider, useEditorScheme } from './editorScheme.provider';

const schemeData: LightsSchemeData = {
  uid: 'uid',
  updatedAt: '',
  scheme: {
    name: 'test',
    frames: [
      {
        type: DEFAULT_LIGHTS_FRAME_TYPE,
        tempo: DEFAULT_LIGHTS_FRAME_TEMPO,
        colors: [createLightColor(1), createLightColor(2)],
      },
      { type: DEFAULT_LIGHTS_FRAME_TYPE, tempo: DEFAULT_LIGHTS_FRAME_TEMPO, colors: [createLightColor(3)] },
    ],
  },
};

const wrapper = ({ children }: { children: ReactNode }) => (
  <EditorSchemeProvider initialSchemeData={schemeData}>{children}</EditorSchemeProvider>
);

describe('EditorSchemeProvider', () => {
  it('normalizes rows to the first row length', () => {
    const { result } = renderHook(() => useEditorScheme(), { wrapper });
    expect(result.current.lightsScheme.scheme.frames.map((frame) => frame.colors.length)).toEqual([2, 2]);
  });

  it('undo restores the scheme from before the first update and redo reapplies it', () => {
    const { result } = renderHook(() => useEditorScheme(), { wrapper });
    const initial = result.current.lightsScheme.scheme;
    expect(result.current.undoAvailable).toBe(false);

    act(() => result.current.handleUpdate({ ...initial, name: 'changed' }));
    expect(result.current.undoAvailable).toBe(true);

    act(() => result.current.handleUndo());
    expect(result.current.lightsScheme.scheme).toEqual(initial);
    expect(result.current.redoAvailable).toBe(true);

    act(() => result.current.handleRedo());
    expect(result.current.lightsScheme.scheme.name).toBe('changed');
  });

  it('saves the scheme without padding rows', () => {
    const listener = vi.fn();
    document.addEventListener('app:save:scheme', listener);
    const { result } = renderHook(() => useEditorScheme(), { wrapper });

    act(() => result.current.handleSave());

    const event = listener.mock.calls[0]?.[0] as CustomEvent<SaveSchemeDeviceEvent['detail']>;
    expect(event.detail.uid).toBe('uid');
    expect(event.detail.scheme.frames.map((frame) => frame.colors.length)).toEqual([2, 2]);
    document.removeEventListener('app:save:scheme', listener);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest components/editor/providers/editorScheme.provider.spec.tsx --run --coverage.enabled=false`
Expected: FAIL.
- "normalizes" fails: lengths are `[2, 1]`.
- "undo" fails: after undo the name is still `'changed'`.
- "saves" fails: lengths are `[2, 1]`, because the scheme is not normalized and `handleSave(undefined)` keeps rows as-is (`slice(0, undefined)`).

- [ ] **Step 3: Implement**

In `components/editor/providers/editorScheme.provider.tsx`:

1. Replace the imports:

```tsx
import type { ReactNode } from 'react';
import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { SaveSchemeDeviceEvent } from '../../../lib/devices/devicesEvents';
import { DEFAULT_LIGHTS_SCHEME } from '../../../lib/lights/lights.config';
import type { LightsScheme, LightsSchemeData } from '../../../lib/lights/lights.types';
import { dispatchCustomEvent } from '../../../lib/utils/customEvent/customEvent';
import { generateUid } from '../../../lib/utils/uid/uid';
import { EDITOR_MAX_HISTORY } from '../editor.config';
import { normalizeScheme } from '../editor.utils';
```

2. In `EditorSchemeContextValue`, change the save signature to `handleSave: () => void;`.

3. Add above `EditorSchemeProvider`:

```tsx
const createInitialSchemeData = (initialSchemeData?: LightsSchemeData): LightsSchemeData => {
  const data = initialSchemeData ?? {
    scheme: DEFAULT_LIGHTS_SCHEME,
    uid: generateUid(),
    updatedAt: new Date().toISOString(),
  };
  return { ...data, scheme: normalizeScheme(data.scheme) };
};
```

4. Replace the three `useState` lines for `lightsScheme`, `history` and `historyIndex` with:

```tsx
  const [lightsScheme, setLightsScheme] = useState<LightsSchemeData>(() => createInitialSchemeData(initialSchemeData));
  const [history, setHistory] = useState<LightsScheme[]>(() => [lightsScheme.scheme]);
  const [historyIndex, setHistoryIndex] = useState(0);
```

5. Replace `handleSave` with:

```tsx
  const handleSave = useCallback(() => {
    dispatchCustomEvent<SaveSchemeDeviceEvent>({
      name: 'app:save:scheme',
      detail: { uid: lightsScheme.uid, scheme: lightsScheme.scheme },
    });
  }, [lightsScheme]);
```

In `components/editor/editor.provider.tsx`, change the facade line `handleSave: () => scheme.handleSave(frame.lightsLayout.value),` to:

```tsx
      handleSave: scheme.handleSave,
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm vitest components/editor/providers/editorScheme.provider.spec.tsx --run --coverage.enabled=false`
Expected: PASS.

- [ ] **Step 5: Gates and commit**

```bash
pnpm fmt && pnpm typecheck && pnpm lint && pnpm test
git add components/editor/providers/editorScheme.provider.tsx components/editor/providers/editorScheme.provider.spec.tsx components/editor/editor.provider.tsx
git commit -m "fix: seed undo history and save scheme without padding"
```

---

### Task 5: Grid provider and footer tools

**Files:**
- Create: `components/editor/providers/editorGrid.provider.tsx`
- Modify: `components/editor/providers/index.tsx`
- Modify: `lib/config/messages.ts`
- Modify: `components/editor/components/colorPickerTools.tsx`
- Create: `components/editor/components/lightsCountTools.tsx`
- Create: `components/editor/components/editorRowTools.tsx`
- Create: `components/editor/components/editorModeTools.tsx`
- Test: `components/editor/components/editorModeTools.spec.tsx`

**Interfaces:**
- Consumes: Task 1 operations, `EDITOR_LIGHTS_COUNT_MIN/MAX`, `EDITOR_ROWS_MAX`, `EditorMode`
- Produces:
  - `useEditorGrid(): { mode: EditorMode; setMode(mode: EditorMode): void; activeRow: number; setActiveRow(row: number): void; previewRow: number; setPreviewRow(row: number): void }`. `activeRow` and `previewRow` are clamped to the last row.
  - `EditorGridProvider`
  - `useEditorGrid` exported from `providers/index.tsx`
  - Components `EditorModeTools`, `LightsCountTools`, `EditorRowTools`
  - New `MESSAGES.editor` keys: `grid`, `paintMode`, `editMode`, `lightsCount`, `decreaseLights`, `increaseLights`, `addRow`, `cloneRow`, `deleteRow`, `undo`, `redo`

- [ ] **Step 1: Messages**

In `lib/config/messages.ts`, replace the `editor` block with:

```ts
  editor: {
    choseColor: 'Choose a color',
    grid: 'Scheme grid',
    paintMode: 'Paint',
    editMode: 'Edit rows',
    lightsCount: 'Lights count',
    decreaseLights: 'Decrease lights count',
    increaseLights: 'Increase lights count',
    addRow: 'Add row',
    cloneRow: 'Clone row',
    deleteRow: 'Delete row',
    undo: 'Undo',
    redo: 'Redo',
  },
```

- [ ] **Step 2: Write the failing tests**

Create `components/editor/components/editorModeTools.spec.tsx`:

```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MESSAGES } from '../../../lib/config/messages';
import {
  createLightColor,
  DEFAULT_LIGHTS_FRAME_TEMPO,
  DEFAULT_LIGHTS_FRAME_TYPE,
} from '../../../lib/lights/lights.config';
import type { LightsSchemeData } from '../../../lib/lights/lights.types';
import { EditorProviders, useEditorScheme } from '../providers';
import { EditorModeTools } from './editorModeTools';

const Probe = () => {
  const { lightsScheme } = useEditorScheme();
  return <output aria-label="rows">{lightsScheme.scheme.frames.length}</output>;
};

const singleRow: LightsSchemeData = {
  uid: 'uid',
  updatedAt: '',
  scheme: {
    name: 'single',
    frames: [{ type: DEFAULT_LIGHTS_FRAME_TYPE, tempo: DEFAULT_LIGHTS_FRAME_TEMPO, colors: [createLightColor(1)] }],
  },
};

const renderTools = (initialSchemeData?: LightsSchemeData) =>
  render(
    <EditorProviders initialSchemeData={initialSchemeData}>
      <EditorModeTools />
      <Probe />
    </EditorProviders>,
  );

const rows = () => Number(screen.getByLabelText('rows').textContent);
const lightsInput = () => screen.getByRole('textbox', { name: MESSAGES.editor.lightsCount });
const button = (name: string) => screen.getByRole('button', { name });

describe('EditorModeTools', () => {
  it('starts in paint mode and switches to edit mode with row tools', () => {
    renderTools();
    expect(button(MESSAGES.editor.paintMode)).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByRole('button', { name: MESSAGES.editor.addRow })).not.toBeInTheDocument();

    fireEvent.click(button(MESSAGES.editor.editMode));

    expect(button(MESSAGES.editor.editMode)).toHaveAttribute('aria-pressed', 'true');
    expect(button(MESSAGES.editor.addRow)).toBeInTheDocument();
  });

  it('changes lights count with buttons and disables decrease at minimum', () => {
    renderTools(singleRow);
    expect(lightsInput()).toHaveValue('1');
    expect(button(MESSAGES.editor.decreaseLights)).toBeDisabled();

    fireEvent.click(button(MESSAGES.editor.increaseLights));

    expect(lightsInput()).toHaveValue('2');
  });

  it('accepts digits only and clamps typed value on blur', () => {
    renderTools(singleRow);
    fireEvent.change(lightsInput(), { target: { value: '3a0x0' } });
    expect(lightsInput()).toHaveValue('300');

    fireEvent.blur(lightsInput());

    expect(lightsInput()).toHaveValue('255');
  });

  it('adds, clones and deletes rows', () => {
    renderTools();
    fireEvent.click(button(MESSAGES.editor.editMode));
    const initial = rows();

    fireEvent.click(button(MESSAGES.editor.addRow));
    expect(rows()).toBe(initial + 1);

    fireEvent.click(button(MESSAGES.editor.cloneRow));
    expect(rows()).toBe(initial + 2);

    fireEvent.click(button(MESSAGES.editor.deleteRow));
    expect(rows()).toBe(initial + 1);
  });

  it('disables delete for the last row', () => {
    renderTools(singleRow);
    fireEvent.click(button(MESSAGES.editor.editMode));
    expect(button(MESSAGES.editor.deleteRow)).toBeDisabled();
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `pnpm vitest components/editor/components/editorModeTools.spec.tsx --run --coverage.enabled=false`
Expected: FAIL, the module `./editorModeTools` can't be resolved.

- [ ] **Step 4: Implement the grid provider**

Create `components/editor/providers/editorGrid.provider.tsx`:

```tsx
import type { ReactNode } from 'react';
import { createContext, useContext, useMemo, useState } from 'react';
import type { EditorMode } from '../editor.types';
import { useEditorScheme } from './editorScheme.provider';

interface EditorGridContextValue {
  mode: EditorMode;
  setMode: (mode: EditorMode) => void;
  activeRow: number;
  setActiveRow: (row: number) => void;
  previewRow: number;
  setPreviewRow: (row: number) => void;
}

const EditorGridContext = createContext<EditorGridContextValue | null>(null);

export const useEditorGrid = () => {
  const ctx = useContext(EditorGridContext);
  if (!ctx) throw new Error('useEditorGrid must be used within EditorGridProvider');
  return ctx;
};

export const EditorGridProvider = ({ children }: { children: ReactNode }) => {
  const { lightsScheme } = useEditorScheme();
  const [mode, setMode] = useState<EditorMode>('paint');
  const [activeRow, setActiveRow] = useState(0);
  const [previewRow, setPreviewRow] = useState(0);
  const lastRow = Math.max(0, lightsScheme.scheme.frames.length - 1);

  const value = useMemo(
    () => ({
      mode,
      setMode,
      activeRow: Math.min(activeRow, lastRow),
      setActiveRow,
      previewRow: Math.min(previewRow, lastRow),
      setPreviewRow,
    }),
    [mode, activeRow, previewRow, lastRow],
  );

  return <EditorGridContext.Provider value={value}>{children}</EditorGridContext.Provider>;
};
```

In `components/editor/providers/index.tsx`:
- Add the import `import { EditorGridProvider } from './editorGrid.provider';`.
- Add the export `export { useEditorGrid } from './editorGrid.provider';`.
- Wrap the frame provider so the tree becomes:

```tsx
  <EditorSchemeProvider initialSchemeData={initialSchemeData}>
    <EditorColorProvider>
      <EditorGridProvider>
        <EditorFrameProvider>
          <EditorSyncEffects>{children}</EditorSyncEffects>
        </EditorFrameProvider>
      </EditorGridProvider>
    </EditorColorProvider>
  </EditorSchemeProvider>
```

- [ ] **Step 5: Migrate ColorPickerTools off the facade**

In `components/editor/components/colorPickerTools.tsx`, replace `import { useEditor } from '../editor.provider';` with `import { useEditorColor } from '../providers';`, and in `ColorPickerTools` replace `useEditor()` with `useEditorColor()`.

- [ ] **Step 6: Implement the tools**

Create `components/editor/components/lightsCountTools.tsx`:

```tsx
import { MinusIcon, PlusIcon } from 'lucide-react';
import { useState } from 'react';
import { MESSAGES } from '../../../lib/config/messages';
import { Button } from '../../../lib/ui/button/button';
import { Input } from '../../../lib/ui/input/input';
import { EDITOR_LIGHTS_COUNT_MAX, EDITOR_LIGHTS_COUNT_MIN } from '../editor.config';
import { clampLightsCount, getLightsCount, resizeScheme } from '../editor.utils';
import { useEditorScheme } from '../providers';

export const LightsCountTools = () => {
  const { lightsScheme, handleUpdate } = useEditorScheme();
  const [draft, setDraft] = useState<string | null>(null);
  const lightsCount = getLightsCount(lightsScheme.scheme);

  const setLightsCount = (value: number) => {
    const next = clampLightsCount(value);
    if (next !== lightsCount) handleUpdate(resizeScheme(lightsScheme.scheme, next));
  };

  const commitDraft = () => {
    if (draft === null) return;
    const value = Number.parseInt(draft, 10);
    if (!Number.isNaN(value)) setLightsCount(value);
    setDraft(null);
  };

  return (
    <div className="flex gap-1">
      <Button
        aria-label={MESSAGES.editor.decreaseLights}
        disabled={lightsCount <= EDITOR_LIGHTS_COUNT_MIN}
        onClick={() => setLightsCount(lightsCount - 1)}
      >
        <MinusIcon />
      </Button>
      <Input
        className="w-16 text-center"
        inputMode="numeric"
        aria-label={MESSAGES.editor.lightsCount}
        value={draft ?? `${lightsCount}`}
        onChange={(event) => setDraft(event.target.value.replaceAll(/\D/g, ''))}
        onBlur={commitDraft}
        onKeyDown={(event) => {
          if (event.key === 'Enter') event.currentTarget.blur();
        }}
      />
      <Button
        aria-label={MESSAGES.editor.increaseLights}
        disabled={lightsCount >= EDITOR_LIGHTS_COUNT_MAX}
        onClick={() => setLightsCount(lightsCount + 1)}
      >
        <PlusIcon />
      </Button>
    </div>
  );
};
```

Create `components/editor/components/editorRowTools.tsx`:

```tsx
import { CopyPlusIcon, ListPlusIcon, Trash2Icon } from 'lucide-react';
import { MESSAGES } from '../../../lib/config/messages';
import { LIGHTS_FRAME_TEMPO_OPTIONS, LIGHTS_FRAME_TYPES } from '../../../lib/lights/lights.config';
import { Button } from '../../../lib/ui/button/button';
import { SelectWrapper } from '../../../lib/ui/select/select';
import { EDITOR_ROWS_MAX } from '../editor.config';
import { addRow, cloneRow, deleteRow, updateRow } from '../editor.utils';
import { useEditorGrid, useEditorScheme } from '../providers';

export const EditorRowTools = () => {
  const { lightsScheme, handleUpdate } = useEditorScheme();
  const { activeRow, setActiveRow, setPreviewRow } = useEditorGrid();
  const { scheme } = lightsScheme;
  const frame = scheme.frames[activeRow];

  if (!frame) return null;

  const rowsCount = scheme.frames.length;
  const selectRow = (row: number) => {
    setActiveRow(row);
    setPreviewRow(row);
  };

  return (
    <div className="flex gap-2 flex-wrap">
      <SelectWrapper
        options={LIGHTS_FRAME_TYPES.map((option) => ({ value: `${option.value}`, label: option.label }))}
        value={`${frame.type}`}
        onChange={(value) => {
          const type = LIGHTS_FRAME_TYPES.find((option) => `${option.value}` === value);
          if (type) handleUpdate(updateRow(scheme, activeRow, { type: type.value }));
        }}
      />
      <SelectWrapper
        options={LIGHTS_FRAME_TEMPO_OPTIONS}
        value={`${frame.tempo}`}
        onChange={(value) => {
          const tempo = Number.parseInt(value, 10);
          if (tempo) handleUpdate(updateRow(scheme, activeRow, { tempo }));
        }}
      />
      <div className="flex gap-1 ml-auto">
        <Button
          aria-label={MESSAGES.editor.addRow}
          disabled={rowsCount >= EDITOR_ROWS_MAX}
          onClick={() => {
            handleUpdate(addRow(scheme, activeRow));
            selectRow(activeRow + 1);
          }}
        >
          <ListPlusIcon />
        </Button>
        <Button
          aria-label={MESSAGES.editor.cloneRow}
          disabled={rowsCount >= EDITOR_ROWS_MAX}
          onClick={() => {
            handleUpdate(cloneRow(scheme, activeRow));
            selectRow(activeRow + 1);
          }}
        >
          <CopyPlusIcon />
        </Button>
        <Button
          aria-label={MESSAGES.editor.deleteRow}
          disabled={rowsCount <= 1}
          onClick={() => {
            handleUpdate(deleteRow(scheme, activeRow));
            selectRow(Math.max(0, activeRow - 1));
          }}
        >
          <Trash2Icon />
        </Button>
      </div>
    </div>
  );
};
```

Create `components/editor/components/editorModeTools.tsx`:

```tsx
import { PaintbrushIcon, Rows3Icon } from 'lucide-react';
import { MESSAGES } from '../../../lib/config/messages';
import { Button } from '../../../lib/ui/button/button';
import { useEditorGrid } from '../providers';
import { ColorPickerTools } from './colorPickerTools';
import { EditorRowTools } from './editorRowTools';
import { LightsCountTools } from './lightsCountTools';

export const EditorModeTools = () => {
  const { mode, setMode } = useEditorGrid();

  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between gap-2">
        <div className="flex gap-1">
          <Button
            aria-label={MESSAGES.editor.paintMode}
            aria-pressed={mode === 'paint'}
            variant={mode === 'paint' ? 'secondary' : 'default'}
            onClick={() => setMode('paint')}
          >
            <PaintbrushIcon />
          </Button>
          <Button
            aria-label={MESSAGES.editor.editMode}
            aria-pressed={mode === 'edit'}
            variant={mode === 'edit' ? 'secondary' : 'default'}
            onClick={() => setMode('edit')}
          >
            <Rows3Icon />
          </Button>
        </div>
        <LightsCountTools />
      </div>
      {mode === 'paint' ? <ColorPickerTools /> : <EditorRowTools />}
    </div>
  );
};
```

- [ ] **Step 7: Run tests to verify they pass**

Run: `pnpm vitest components/editor/components/editorModeTools.spec.tsx --run --coverage.enabled=false`
Expected: PASS.

- [ ] **Step 8: Gates and commit**

```bash
pnpm fmt && pnpm typecheck && pnpm lint && pnpm test
git add lib/config/messages.ts components/editor/providers components/editor/components
git commit -m "feat: add grid provider, mode switch, lights count and row tools"
```

---

### Task 6: Wire SchemeGrid into a full-screen editor and remove the frame editor

**Files:**
- Create: `components/editor/components/schemeGrid/schemeGrid.tsx`
- Modify: `components/editor/components/lightsFrameShiftTools.tsx`
- Modify: `components/editor/components/lightsSchemeStateTools.tsx`
- Modify: `components/editor/providers/useSchemeDeviceSync.ts`
- Modify: `components/editor/providers/index.tsx`
- Modify: `components/editor/editor.tsx`
- Modify: `app/routes/editor.tsx`
- Modify: `components/editor/editor.utils.ts`, `components/editor/editor.utils.spec.ts`, `components/editor/editor.types.ts`
- Modify: `lib/lights/lights.types.ts`, `lib/lights/lights.config.ts`, `lib/devices/devices.utils.ts`
- Delete: `components/editor/editor.provider.tsx`, `components/editor/editor.hooks.ts`, `components/editor/providers/editorFrame.provider.tsx`, `components/editor/components/lightsFrameGrid/` (whole folder), `components/editor/components/lightsFrameStateTools.tsx`
- Test: `components/editor/editor.spec.tsx`

**Interfaces:**
- Consumes: everything from Tasks 1–5
- Produces: `SchemeGrid` component; `Editor` renders the full-screen layout.

- [ ] **Step 1: Write the failing smoke test**

Create `components/editor/editor.spec.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MESSAGES } from '../../lib/config/messages';
import { Editor } from './editor';

beforeEach(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe = vi.fn();
      disconnect = vi.fn();
    },
  );
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('Editor', () => {
  it('renders header tools, the scheme grid canvas and footer tools', () => {
    render(<Editor />);
    expect(screen.getByLabelText(MESSAGES.editor.grid).tagName).toBe('CANVAS');
    expect(screen.getByRole('button', { name: MESSAGES.editor.paintMode })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: MESSAGES.editor.undo })).toBeInTheDocument();
    expect(screen.queryByText(/ : /)).not.toBeInTheDocument();
  });
});
```

The last assertion checks that the old `frameIndex : framesCount` navigation is gone.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest components/editor/editor.spec.tsx --run --coverage.enabled=false`
Expected: FAIL, nothing with the label "Scheme grid" is found.

- [ ] **Step 3: Implement SchemeGrid**

Create `components/editor/components/schemeGrid/schemeGrid.tsx`:

```tsx
import { useEffect, useEffectEvent, useMemo, useRef } from 'react';
import { MESSAGES } from '../../../../lib/config/messages';
import type { GridCell } from '../../editor.types';
import { moveRow, paintCells, resolveBinaryColorStyle } from '../../editor.utils';
import { useEditorColor, useEditorGrid, useEditorScheme } from '../../providers';
import type { GridController } from './schemeGrid.controller';
import { createGridController } from './schemeGrid.controller';

export const SchemeGrid = () => {
  const { lightsScheme, handleUpdate } = useEditorScheme();
  const { color } = useEditorColor();
  const { mode, activeRow, setActiveRow, setPreviewRow } = useEditorGrid();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const controllerRef = useRef<GridController | null>(null);
  const { scheme } = lightsScheme;

  const colors = useMemo(
    () => scheme.frames.map((frame) => frame.colors.map((lightColor) => resolveBinaryColorStyle(lightColor))),
    [scheme.frames],
  );

  const onPaint = useEffectEvent((cells: GridCell[]) => {
    handleUpdate(paintCells(scheme, cells, color));
    const last = cells.at(-1);
    if (last) setPreviewRow(last.row);
  });

  const onSelectRow = useEffectEvent((row: number) => {
    setActiveRow(row);
    setPreviewRow(row);
  });

  const onMoveRow = useEffectEvent((from: number, to: number) => {
    handleUpdate(moveRow(scheme, from, to));
    setActiveRow(to);
    setPreviewRow(to);
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const controller = createGridController(canvas, {
      onPaint: (cells) => onPaint(cells),
      onSelectRow: (row) => onSelectRow(row),
      onMoveRow: (from, to) => onMoveRow(from, to),
    });
    controllerRef.current = controller;
    return () => {
      controller.destroy();
      controllerRef.current = null;
    };
  }, []);

  useEffect(() => {
    controllerRef.current?.update({ colors, mode, activeRow, paintColor: resolveBinaryColorStyle(color) });
  }, [colors, mode, activeRow, color]);

  return (
    <div className="relative flex-1 min-h-0 w-full">
      <canvas
        ref={canvasRef}
        aria-label={MESSAGES.editor.grid}
        className="absolute inset-0 block w-full h-full touch-none select-none text-foreground"
      />
    </div>
  );
};
```

- If oxlint reports `react-hooks` errors for passing effect events into the controller, keep the arrow wrappers. If it still complains, report the exact message rather than disabling rules broadly.

- [ ] **Step 4: Header with new semantics**

Replace `components/editor/components/lightsFrameShiftTools.tsx` with:

```tsx
import {
  ArrowDownFromLineIcon,
  ArrowLeftFromLineIcon,
  ArrowLeftToLineIcon,
  ArrowRightFromLineIcon,
  ArrowRightToLineIcon,
  ArrowUpFromLineIcon,
  ShuffleIcon,
} from 'lucide-react';
import { Button } from '../../../lib/ui/button/button';
import { shiftRow, shiftScheme, shuffleRow } from '../editor.utils';
import { useEditorGrid, useEditorScheme } from '../providers';

const buttonClassName = 'flex-1 min-w-min';

export const LightsFrameShiftTools = () => {
  const { lightsScheme, handleUpdate } = useEditorScheme();
  const { activeRow } = useEditorGrid();
  const { scheme } = lightsScheme;

  return (
    <div className="flex gap-1 justify-center">
      <Button className={buttonClassName} onClick={() => handleUpdate(shiftRow(scheme, activeRow, -1))}>
        <ArrowLeftToLineIcon />
      </Button>
      <Button className={buttonClassName} onClick={() => handleUpdate(shiftScheme(scheme, 'left'))}>
        <ArrowLeftFromLineIcon />
      </Button>
      <Button className={buttonClassName} onClick={() => handleUpdate(shiftScheme(scheme, 'up'))}>
        <ArrowUpFromLineIcon />
      </Button>
      <Button className={buttonClassName} onClick={() => handleUpdate(shuffleRow(scheme, activeRow))}>
        <ShuffleIcon />
      </Button>
      <Button className={buttonClassName} onClick={() => handleUpdate(shiftScheme(scheme, 'down'))}>
        <ArrowDownFromLineIcon />
      </Button>
      <Button className={buttonClassName} onClick={() => handleUpdate(shiftScheme(scheme, 'right'))}>
        <ArrowRightFromLineIcon />
      </Button>
      <Button className={buttonClassName} onClick={() => handleUpdate(shiftRow(scheme, activeRow, 1))}>
        <ArrowRightToLineIcon />
      </Button>
    </div>
  );
};
```

- [ ] **Step 5: Scheme state tools off the facade**

In `components/editor/components/lightsSchemeStateTools.tsx`:
- Replace `import { useEditor } from '../editor.provider';` with `import { useEditorScheme } from '../providers';`, and add `import { MESSAGES } from '../../../lib/config/messages';`.
- Replace `useEditor()` with `useEditorScheme()`.
- Add `aria-label={MESSAGES.editor.undo}` to the undo `Button` and `aria-label={MESSAGES.editor.redo}` to the redo `Button`.

- [ ] **Step 6: Device sync on the preview row**

Replace `components/editor/providers/useSchemeDeviceSync.ts` with:

```ts
import { useEffect } from 'react';
import type { UpdateSchemeDeviceEvent } from '../../../lib/devices/devicesEvents';
import { dispatchCustomEvent } from '../../../lib/utils/customEvent/customEvent';
import { useEditorColor } from './editorColor.provider';
import { useEditorGrid } from './editorGrid.provider';
import { useEditorScheme } from './editorScheme.provider';

export const useSchemeDeviceSync = () => {
  const { lightsScheme } = useEditorScheme();
  const { isColorDialogOpen } = useEditorColor();
  const { previewRow } = useEditorGrid();
  const previewFrame = lightsScheme.scheme.frames[previewRow];

  /* oxlint-disable react-hooks/exhaustive-deps -- device shows only the preview frame, skip other scheme changes */
  useEffect(() => {
    if (isColorDialogOpen || !previewFrame) return;
    dispatchCustomEvent<UpdateSchemeDeviceEvent>({
      name: 'app:update:scheme',
      detail: { scheme: lightsScheme.scheme, frameIndex: previewRow },
    });
  }, [isColorDialogOpen, previewFrame, previewRow]);
  /* oxlint-enable react-hooks/exhaustive-deps */
};
```

- [ ] **Step 7: Providers without the frame provider**

In `components/editor/providers/index.tsx`, remove the `EditorFrameProvider` import, the `useEditorFrame` re-export and the `<EditorFrameProvider>` wrapper, so the tree is:

```tsx
  <EditorSchemeProvider initialSchemeData={initialSchemeData}>
    <EditorColorProvider>
      <EditorGridProvider>
        <EditorSyncEffects>{children}</EditorSyncEffects>
      </EditorGridProvider>
    </EditorColorProvider>
  </EditorSchemeProvider>
```

- [ ] **Step 8: Full-screen layout**

Replace `components/editor/editor.tsx` with:

```tsx
import { EditorModeTools } from './components/editorModeTools';
import { LightsFrameShiftTools } from './components/lightsFrameShiftTools';
import { LightsSchemeStateTools } from './components/lightsSchemeStateTools';
import { SchemeGrid } from './components/schemeGrid/schemeGrid';
import type { EditorProps } from './editor.types';
import { EditorProviders } from './providers';

const toolbarClassName = 'shrink-0 w-sm max-w-full-gap mx-auto';

export const Editor = ({ lightsSchemeData }: EditorProps) => (
  <EditorProviders initialSchemeData={lightsSchemeData}>
    <div className="flex flex-col flex-1 min-h-0 w-full gap-2 py-2">
      <div className={toolbarClassName}>
        <LightsFrameShiftTools />
      </div>
      <SchemeGrid />
      <div className={`${toolbarClassName} flex flex-col gap-2`}>
        <EditorModeTools />
        <LightsSchemeStateTools />
      </div>
    </div>
  </EditorProviders>
);
```

Replace `app/routes/editor.tsx` with:

```tsx
import { Editor } from '../../components/editor/editor';

const EditorPage = () => (
  <div className="relative flex flex-col flex-1 min-h-0 w-full">
    <Editor />
  </div>
);

export default EditorPage;
```

`body` already has `min-height: 100svh` and is a flex column (`lib/ui/tailwind-theme.css`), and `main` is `flex-1`. So the grid takes the remaining viewport height between the page header and the footer.

- [ ] **Step 9: Delete the old frame editor**

```bash
git rm components/editor/editor.provider.tsx components/editor/editor.hooks.ts components/editor/providers/editorFrame.provider.tsx components/editor/components/lightsFrameStateTools.tsx
git rm -r components/editor/components/lightsFrameGrid
```

In `components/editor/editor.utils.ts`:
- Delete `transposeLightsMatrix`, `shiftColorsFrame` and `shiftLightsFrameColorPixel`.
- Change the types import to `import type { GridCell, SchemeShiftDirection } from './editor.types';`.
- Remove `LightsLayoutOption` from the lights types import.

In `components/editor/editor.types.ts`:
- Delete `ShiftDirection` and `ShiftColorsFrame`.
- Remove the now-unused `LightColor` type import if nothing else uses it.

In `components/editor/editor.utils.spec.ts`:
- Delete the whole `describe('shiftColorsFrame', ...)` block and the `createTestFrame` helper.
- Remove `shiftColorsFrame` from the import.

In `lib/lights/lights.types.ts`, delete `LightsLayoutOption` and `LightsLayoutOptions`.

In `lib/lights/lights.config.ts`, delete `DEFAULT_LIGHTS_LAYOUT_OPTIONS`, `DEFAULT_LIGHTS_LAYOUT_OPTION` and the `LightsLayoutOptions` import.

In `lib/devices/devices.utils.ts`:
- Delete `resolveFrameColorIndexes` and `resolveLightsSchemeColorIndexes`.
- Remove the imports that become unused (`LIGHTS_BACKGROUND_COLOR`, `LightsScheme`); `pnpm typecheck` and `pnpm lint` will list them.

Verify that nothing references the removed code (the command must print nothing):

```bash
grep -rnE "useEditor\(|editor\.provider|editor\.hooks|useEditorFrame|lightsLayout|LightsLayout|LIGHTS_LAYOUT|resolveLightsSchemeColorIndexes|shiftColorsFrame|lightsFrameGrid|LightsFrameStateTools" app components lib
```

- [ ] **Step 10: Run tests to verify they pass**

Run: `pnpm vitest components/editor --run --coverage.enabled=false`
Expected: PASS (all editor specs including `editor.spec.tsx`).

- [ ] **Step 11: Gates and commit**

```bash
pnpm fmt && pnpm typecheck && pnpm lint && pnpm test && pnpm run fallow
git add -A app components lib
git commit -m "feat: full-screen infinite scheme grid editor"
```

If `pnpm test` fails only on coverage thresholds, run `pnpm test` and read the summary.
- Below threshold: report the numbers and stop; do not lower thresholds.
- Above threshold: continue to Task 7.

---

### Task 7: Verification and coverage thresholds

**Files:**
- Modify: `vite.config.mjs` (coverage thresholds)
- Modify: `CLAUDE.md` (architecture line for `components/`)

- [ ] **Step 1: Raise coverage thresholds**

Run: `pnpm test`.
- Read the `Coverage summary`.
- Set `thresholds` in `vite.config.mjs` to each metric rounded down to the nearest integer. Thresholds only go up; keep any value that would drop.

- [ ] **Step 2: Update the architecture line**

In `CLAUDE.md`, replace

```
- `components/` - editor (lights frame grid, color picker, scheme state) and connected devices UI
```

with

```
- `components/` - editor (infinite canvas scheme grid, paint/edit modes, color picker, scheme state) and connected devices UI
```

- [ ] **Step 3: Manual browser verification**

Run: `pnpm dev`, then open `http://localhost:3000/editor` with Playwright or Chrome DevTools at 1440×900 and 375×812 (touch emulation). Check and note pass/fail for each:

1. The grid fills the space between the header tools and the footer, with no page scrollbar.
2. Lights count 2 + 3 rows gives alternating columns and repeating rows across the whole viewport.
3. Lights count 1 + 1 row makes the whole grid one color.
4. Painting a cell repaints every copy, and undo reverts the whole stroke.
5. Wheel/trackpad pans in both directions endlessly, with no jumps at block borders.
6. Touch: 1 finger paints, 2 fingers pan, and a 2-finger start does not leave paint.
7. Edit mode:
   - tap outlines all copies of the row;
   - long press + drag reorders with animation;
   - type, tempo, add, clone and delete work;
   - prev/next shift the active row with wrapping.
8. Header up/down/left/right shift the whole scheme.
9. Performance trace while panning for ~5 s at 1440×900: no long tasks > 50 ms during panning.

- [ ] **Step 4: Full gates and commit**

```bash
pnpm fmt:check && pnpm typecheck && pnpm lint && pnpm test && pnpm run fallow
git add vite.config.mjs CLAUDE.md
git commit -m "chore: raise coverage thresholds after scheme editor"
git push
```

- [ ] **Step 5: Report**

Report the results of each manual check, the final coverage numbers and the PR link. Do not merge PR #8.
