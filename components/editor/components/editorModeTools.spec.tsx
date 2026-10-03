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
