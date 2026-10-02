import type { LightColor, LightsSchemeData } from '../../lib/lights/lights.types';

export type ShiftDirection = 'up' | 'down' | 'left' | 'right' | 'prev' | 'next' | 'shuffle';

export type ShiftColorsFrame = (
  colors: LightColor[],
  direction: ShiftDirection,
  rowsCount: number,
  columnsCount: number,
) => LightColor[];

export type EditorMode = 'paint' | 'edit';

export type SchemeShiftDirection = 'up' | 'down' | 'left' | 'right';

export interface GridCell {
  row: number;
  column: number;
}

export interface EditorProps {
  lightsSchemeData?: LightsSchemeData | undefined;
}

export interface EditorColorPalette {
  color: string;
  index: number;
}
