import type { LightsSchemeData } from '../../lib/lights/lights.types';

export type EditorMode = 'paint' | 'edit';

export type SchemeShiftDirection = 'up' | 'down' | 'left' | 'right';

export interface GridCell {
  row: number;
  column: number;
}

export interface EditorProps {
  lightsSchemeData?: LightsSchemeData | undefined;
  onlineId?: string | undefined;
}

export interface EditorColorPalette {
  color: string;
  index: number;
}
