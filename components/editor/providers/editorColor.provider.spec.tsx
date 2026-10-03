import { act, render } from '@testing-library/react';
import { useEffect } from 'react';
import { beforeEach, describe, expect, it } from 'vitest';
import { createLightColor } from '../../../lib/lights/lights.config';
import { EditorColorProvider, useEditorColor } from './editorColor.provider';

let editor: ReturnType<typeof useEditorColor>;

const Probe = () => {
  const color = useEditorColor();
  useEffect(() => {
    editor = color;
  });
  return null;
};

const recent = () => editor.recentColors.map(({ index }) => index);

const pickInDialog = (index: number) => {
  act(() => editor.handleColorDialogOpenChange(true));
  act(() => editor.selectColor(createLightColor(index)));
  act(() => editor.handleColorDialogOpenChange(false));
};

const X = 5;
const Y = 6;

beforeEach(() => {
  render(
    <EditorColorProvider>
      <Probe />
    </EditorColorProvider>,
  );
});

describe('EditorColorProvider', () => {
  it('starts with color 0 and seven recent colors', () => {
    expect(editor.color).toBe(0);
    expect(recent()).toEqual([31, 62, 93, 124, 155, 186, 217]);
  });

  it('pushes the previous picker color when the dialog closes with a new color', () => {
    pickInDialog(X);
    expect(editor.color).toBe(X);
    expect(recent()).toEqual([0, 31, 62, 93, 124, 155, 186]);

    pickInDialog(Y);
    expect(recent()).toEqual([X, 0, 31, 62, 93, 124, 155]);
  });

  it('keeps the recent colors when the dialog closes with the same color', () => {
    pickInDialog(0);
    expect(recent()).toEqual([31, 62, 93, 124, 155, 186, 217]);
  });

  it('commits a color picked from the recent grid on dialog close', () => {
    pickInDialog(93);
    expect(editor.color).toBe(93);
    expect(recent()).toEqual([0, 31, 62, 124, 155, 186, 217]);
  });

  it('selects a recent color and shifts the colors up to it', () => {
    act(() => editor.selectRecentColor(3));
    expect(editor.color).toBe(124);
    expect(recent()).toEqual([0, 31, 62, 93, 155, 186, 217]);
  });

  it('swaps the picker color with the first recent color', () => {
    pickInDialog(X);
    act(() => editor.selectRecentColor(0));
    expect(editor.color).toBe(0);
    expect(recent()).toEqual([X, 31, 62, 93, 124, 155, 186]);

    act(() => editor.selectRecentColor(0));
    expect(editor.color).toBe(X);
    expect(recent()).toEqual([0, 31, 62, 93, 124, 155, 186]);
  });

  it('ignores an index outside the recent colors', () => {
    act(() => editor.selectRecentColor(7));
    expect(editor.color).toBe(0);
    expect(recent()).toEqual([31, 62, 93, 124, 155, 186, 217]);
  });
});
