import { act, fireEvent, render, screen } from '@testing-library/react';
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
const swatches = () => screen.getAllByRole('button', { name: new RegExp(`^${MESSAGES.editor.recentColor} \\d$`) });
const background = (element: HTMLElement) => element.style.backgroundColor;
const triggerColor = () => (button(MESSAGES.editor.choseColor).firstElementChild as HTMLElement).style.backgroundColor;

describe('EditorModeTools', () => {
  it('starts in edit mode with row tools and switches to paint mode', () => {
    renderTools();
    expect(button(MESSAGES.editor.editMode)).toHaveAttribute('aria-pressed', 'true');
    expect(button(MESSAGES.editor.addRow)).toBeInTheDocument();

    fireEvent.click(button(MESSAGES.editor.paintMode));

    expect(button(MESSAGES.editor.paintMode)).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByRole('button', { name: MESSAGES.editor.addRow })).not.toBeInTheDocument();
    expect(button(MESSAGES.editor.choseColor)).toBeInTheDocument();
  });

  it('shows seven recent color buttons next to the color picker trigger', () => {
    renderTools();
    fireEvent.click(button(MESSAGES.editor.paintMode));
    const trigger = button(MESSAGES.editor.choseColor);
    const colors = swatches();

    expect(colors).toHaveLength(7);
    expect(trigger.nextElementSibling).toBe(colors[0]);
    colors.forEach((swatch) => expect(swatch).toHaveClass('h-10', 'w-8', 'shrink-0'));
    expect(new Set(colors.map(background)).size).toBe(7);
    expect(colors.map(background)).not.toContain(triggerColor());
  });

  it('selects a recent color without opening the dialog and shifts the colors up to it', () => {
    renderTools();
    fireEvent.click(button(MESSAGES.editor.paintMode));
    const before = swatches().map(background);
    const picker = triggerColor();

    fireEvent.click(button(`${MESSAGES.editor.recentColor} 4`));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(triggerColor()).toBe(before[3]);
    expect(swatches().map(background)).toEqual([
      picker,
      before[0],
      before[1],
      before[2],
      before[4],
      before[5],
      before[6],
    ]);

    fireEvent.click(button(`${MESSAGES.editor.recentColor} 1`));

    expect(triggerColor()).toBe(picker);
    expect(swatches().map(background)).toEqual([before[3], ...before.filter((_, index) => index !== 3)]);
  });

  it('keeps keyboard focus on a clicked recent color slot', () => {
    renderTools();
    fireEvent.click(button(MESSAGES.editor.paintMode));
    const third = button(`${MESSAGES.editor.recentColor} 3`);
    act(() => third.focus());

    fireEvent.click(third);

    expect(document.activeElement).toBe(button(`${MESSAGES.editor.recentColor} 3`));
  });

  it('changes lights count with buttons and disables decrease at minimum', () => {
    renderTools(singleRow);
    expect(lightsInput()).toHaveValue('1');
    expect(button(MESSAGES.editor.decreaseLights)).toHaveAttribute('aria-disabled', 'true');

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
    expect(button(MESSAGES.editor.deleteRow)).toHaveAttribute('aria-disabled', 'true');
    fireEvent.click(button(MESSAGES.editor.deleteRow));
    expect(rows()).toBe(1);
  });

  it('does not run the action of an aria-disabled delete button', () => {
    renderTools(singleRow);
    expect(button(MESSAGES.editor.deleteRow)).toHaveAttribute('aria-disabled', 'true');

    fireEvent.click(button(MESSAGES.editor.deleteRow));

    expect(rows()).toBe(1);
  });
});
