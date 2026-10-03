# Scheme editor redesign

## Goal

Turn the single-frame 8×8 editor into a full-screen editor of the whole scheme: an infinite, repeating grid where each row is one `LightsFrame` and each column is one light. Mobile friendly, smooth on phone and desktop.

## Decisions

- Data model unchanged: `LightsScheme { name, frames[] }`.
  - Lights count `X = frames[0].colors.length`, rows `Y = frames.length`.
  - All rows always have length `X`.
- Lights count UI: number input with −/+ buttons, clamped to 1–255; non-numeric input keeps previous value.
  - Shrinking trims every row, growing pads with `LIGHTS_BACKGROUND_COLOR`; both undoable.
- Device receives exactly `X` colors per frame, no padding.
  - Firmware repeats a shorter frame and trims a longer one (`lightbar-embedded/src/app_lights.c`: `colors[i] = data[i % size]` for `i < CONFIG_APP_LIGHTS_COUNT`).
- Rendering: single `<canvas>` (Canvas 2D), chosen over a DOM cell pool and native scroll with recentering for constant cost and smoothness.
- Gestures:
  - Paint mode: 1 finger / mouse paints; 2 fingers / wheel / trackpad scroll.
  - Edit mode: 1 finger scrolls, tap selects row, long-press (~300 ms) drags row; mouse drag past threshold drags row, wheel scrolls.
- Shift buttons (`LightsFrameShiftTools`) live in the footer's first row, same buttons, new semantics on the scheme as a matrix:
  - `up` / `down`: rotate row order by 1.
  - `left` / `right`: shift all rows by 1 column, wrapping.
  - `prev` / `next`: shift active row by 1, wrapping (row offset).
  - `shuffle`: shuffle colors of active row.
- Footer is contextual: mode switch + lights count, then mode bar, then unchanged `LightsSchemeStateTools`.
- Device preview shows the last touched row, sent after a gesture ends.

## Architecture

### Layout

- `app/routes/editor.tsx` and `Editor` fill the free viewport (`flex-1 min-h-0`); `body` is already a `100svh` flex column.
- Column: `SchemeGrid` (`flex-1 min-h-0`, 8px horizontal padding on each side), footer (`shrink-0`). No header: its shift buttons live in the footer.

### Providers

- `EditorSchemeProvider`: unchanged (scheme, undo/redo history). `handleSave` sends the raw scheme.
- `EditorColorProvider`:
  - picker `color` starts at `0` (`EDITOR_DEFAULT_COLOR`, first palette entry);
  - one shared list of 7 `recentColors` (`EDITOR_RECENT_COLORS_COUNT`), initially `31 * k` for k = 1..7 (`EDITOR_RECENT_COLORS_STEP`);
  - `pushRecentColor(recent, previous, next)` (pure, `editor.utils`): `[previous, ...recent without previous and next].slice(0, 7)`, unchanged when `previous === next`;
  - dialog: color picked inside (any grid, recent grid included) is committed on close as `pushRecentColor(recent, colorAtOpen, color)`;
  - `selectRecentColor(index)`: picker takes the clicked color C, list becomes `pushRecentColor(recent, picker, C)` (first button = swap).
- `EditorGridProvider` replaces `EditorFrameProvider`:
  - `mode: 'paint' | 'edit'` (default `'edit'`)
  - `activeRow` (edit target, default 0)
  - `previewRow` (last touched row, sent to device)
- `useEditor()` facade removed; components use `useEditorScheme`, `useEditorColor`, `useEditorGrid` directly.

### Scheme operations

Pure functions in `editor.utils.ts`, each returns a new `LightsScheme` passed to `handleUpdate` (so all are undoable):

- `resizeScheme(scheme, lightsCount)`
- `paintCells(scheme, cells, color)`
- `addRow(scheme, afterRow)` (background-filled row), `cloneRow(scheme, row)` (inserted after source), `deleteRow(scheme, row)` (keeps at least 1 row)
- `moveRow(scheme, from, to)`
- `shiftRow(scheme, row, delta)` (wrapping)
- `shiftScheme(scheme, 'up' | 'down' | 'left' | 'right')`
- `shuffleRow(scheme, row)`
- `normalizeScheme(scheme)`: on load, pads/trims every row to `frames[0]` length.

Removed: `shiftColorsFrame`, `shiftLightsFrameColorPixel`, `LightsLayoutOption`, layout options and `DEFAULT_LIGHTS_LAYOUT_OPTION`, `resolveLightsSchemeColorIndexes` / `resolveFrameColorIndexes` (all used only by the editor).

A row count limit is kept as a single constant, currently unlimited, to plug in device memory capacity later.

## SchemeGrid (canvas)

Location: `components/editor/components/schemeGrid/`.

### Rendering

- `ResizeObserver` sizes the canvas with `devicePixelRatio`.
- Cell size and gap are constants in `editor.config`, multiplied by a zoom factor `0.5–2` (default 1).
- View offset `(x, y)` is unbounded and kept in a `ref`, not React state.
- Visible cell `(i, j)` renders base cell `(mod(i, Y), mod(j, X))`; CSS colors are resolved once per scheme change.
- Every cell is a rounded rectangle with a 1px stroke in the theme `--border` color (same as icon buttons, `rgb(29, 40, 58)` in dark).
- Dashed separator lines in the foreground color (`outlineColor`, near-white in dark) mark block boundaries in the gaps: horizontal every Y rows (when Y > 1, following the drag preview shift), vertical every X columns (when X > 1). Width is 1 CSS px at any zoom, snapped to whole device pixels; the dash pattern `GRID_SEPARATOR_DASH` (`[4, 4]` CSS px) does not scale with zoom; the line dash is reset after drawing them.
- The active row outline is drawn on ONE copy only: the X cells of the clicked copy (row copy + column block aligned to the vertical separators). The controller remembers the clicked copy's row block and column block; when `activeRow` changes without a click (add/clone/delete/undo, drop), the outline moves to that row in the same blocks. It is shown in both modes.
- Redraw via `requestAnimationFrame` only when dirty.

### Input (same model on touch and desktop)

- Zoom: mouse wheel / trackpad (`ctrlKey` pinch included) and 2-finger pinch on touch; anchored at the pointer / pinch midpoint; clamped to `0.5–2`.
- Pan: 2 fingers on touch (together with pinch); on desktop drag with right or middle button, or Space + left drag; inertia on release.
- Context menu is suppressed on the canvas.

### Paint mode

- 1 finger / left mouse collects base cells of the stroke and draws them locally right away.
- On release: `paintCells` → `handleUpdate`; one stroke is one undo step.
- A second finger during a stroke cancels the stroke and starts a 2-finger pan/pinch.

### Edit mode

- 1 finger / left mouse: move > ~6 px pans; tap/click sets `activeRow` (and the outlined copy); hold ~300 ms without moving lifts the row (mouse too).
- Drag and drop:
  - all copies of the lifted row follow the pointer;
  - other rows animate smoothly to their new positions;
  - drop calls `moveRow(from, to)`; target `t = from + round(deltaY / STEP)`, kept when in `0..Y-1`, otherwise wrapped: `to = mod(t, Y-1)` (no-op when Y = 1), so dragging the last row down inserts it after row 0 of the next block;
  - when wrapped, other rows and the view offset shift by the block remainder so the dropped row stays under the pointer with no jump.

### Inertia

Pan release continues with velocity and friction decay.

## Toolbars

- Footer:
  1. `LightsFrameShiftTools` (moved from the old header, semantics see Decisions).
  2. `EditorModeTools`: Paint/Edit switch + lights count input (−, value, +).
  3. Mode bar:
     - paint: one row `[picker trigger flex-1 min-w-0][7 recent color buttons]`, `gap-1`; each button `h-10 w-8 shrink-0`, shows its color, `aria-label` `Recent color N`; a click selects it without opening the dialog; the dialog's recent grid shows the same 7 colors;
     - edit: type + tempo selects of the active row, add, clone, delete (disabled at 1 row).
  4. `LightsSchemeStateTools`: unchanged.
- Tooltips: every footer control (buttons, inputs, selects, picker trigger, recent colors, Save) has a Radix tooltip (`lib/ui/tooltip`, 300 ms delay, provider mounted in `EditorProviders`) describing its action; texts in `MESSAGES.editor.tooltip`. Selects also carry an `aria-label`. Disabled buttons show no tooltip (browsers fire no pointer events on them).
- Removed: `lightsFrameGrid/` folder; frame prev/next navigation and Copy/Delete dropdown from `LightsFrameStateTools` (its selects move to the edit bar).

## Data flow

- Gesture or button → pure function → `handleUpdate` → history → canvas redraw.
- Exceptions:
  - an in-progress paint stroke lives in a `ref` until release;
  - pan and drag animation live only in `ref` + rAF.
- `activeRow` and `previewRow` are clamped to `Y-1` after delete, undo and redo.

## Device sync

- `useSchemeDeviceSync` dispatches `app:update:scheme` with the raw scheme and `frameIndex = previewRow`.
  - Depends on the whole scheme + `previewRow`, since edits now span many rows.
  - Skipped while the color dialog is open (as today).
- `previewRow` updates on row tap, on stroke end (row of the last painted cell) and on drop (new row position).
- `app:update:color` while the picker is open: unchanged.

## Testing

- Vitest unit tests:
  - every scheme operation, including wrap in both directions, trimming/padding, minimum 1 row, and shuffle keeping the color multiset;
  - point → base cell mapping with modulo, including negative offsets;
  - visible cell range calculation.
- RTL tests: mode switch, lights count −/+ and clamping, edit bar buttons.
- Canvas drawing is not tested in jsdom; gesture logic is extracted into pure functions and tested there.
- Keep existing coverage thresholds.
- Manual: `pnpm dev` in a browser at desktop and ~375 px width; check painting, panning, drag and drop, inertia, and a performance trace while panning.
- Gates: `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm fmt:check`.

## Out of scope

- New header and footer designs (planned later).
- Row count limit based on device memory (constant prepared, unlimited for now).
- Additional per-row parameters beyond type and tempo.
