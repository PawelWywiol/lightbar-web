import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MESSAGES } from '../../lib/config/messages';
import {
  createLightColor,
  DEFAULT_LIGHTS_FRAME_TEMPO,
  DEFAULT_LIGHTS_FRAME_TYPE,
} from '../../lib/lights/lights.config';
import type { LightsSchemeData } from '../../lib/lights/lights.types';
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

const singleRow: LightsSchemeData = {
  uid: 'uid',
  updatedAt: '',
  scheme: {
    name: 'single',
    frames: [{ type: DEFAULT_LIGHTS_FRAME_TYPE, tempo: DEFAULT_LIGHTS_FRAME_TEMPO, colors: [createLightColor(1)] }],
  },
};

const twoLights: LightsSchemeData = {
  ...singleRow,
  scheme: {
    name: 'two',
    frames: [
      {
        type: DEFAULT_LIGHTS_FRAME_TYPE,
        tempo: DEFAULT_LIGHTS_FRAME_TEMPO,
        colors: [createLightColor(1), createLightColor(2)],
      },
    ],
  },
};

const button = (name: string) => screen.getByRole('button', { name });

const expectTooltip = async (control: HTMLElement, text: string) => {
  fireEvent.focus(control);
  expect(await screen.findByRole('tooltip')).toHaveTextContent(text);
};

const expectDisabledTooltip = async (control: HTMLElement, text: string) => {
  expect(control).toHaveAttribute('aria-disabled', 'true');
  act(() => control.focus());
  expect(document.activeElement).toBe(control);
  const tooltip = await screen.findByRole('tooltip');
  expect(tooltip).toHaveTextContent(text);
  expect(control).toHaveAccessibleDescription(text);
  expect(control.getAttribute('aria-describedby')).toBeTruthy();
};

describe('Editor', () => {
  it('renders the scheme grid canvas and footer tools', () => {
    render(<Editor />);
    expect(screen.getByLabelText(MESSAGES.editor.grid).tagName).toBe('CANVAS');
    expect(screen.getByRole('button', { name: MESSAGES.editor.paintMode })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: MESSAGES.editor.undo })).toBeInTheDocument();
    expect(screen.queryByText(/ : /)).not.toBeInTheDocument();
  });

  it('renders the shift buttons in the footer after the canvas', () => {
    render(<Editor />);
    const labels = [
      MESSAGES.editor.shiftRowLeft,
      MESSAGES.editor.shiftAllLeft,
      MESSAGES.editor.rotateRowsUp,
      MESSAGES.editor.shuffleRow,
      MESSAGES.editor.rotateRowsDown,
      MESSAGES.editor.shiftAllRight,
      MESSAGES.editor.shiftRowRight,
    ];
    const canvas = screen.getByLabelText(MESSAGES.editor.grid);
    labels.forEach((name) => {
      expect(canvas.compareDocumentPosition(button(name)) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });
    const grid = canvas.parentElement?.parentElement;
    expect(grid).toBe(grid?.parentElement?.firstElementChild);
  });

  it('places the shift buttons before the mode switch', () => {
    render(<Editor />);
    const shift = screen.getByRole('button', { name: MESSAGES.editor.shiftRowLeft });
    const mode = screen.getByRole('button', { name: MESSAGES.editor.paintMode });
    expect(shift.compareDocumentPosition(mode) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('opens the color dialog from the full-width paint trigger', () => {
    render(<Editor />);
    fireEvent.click(screen.getByRole('button', { name: MESSAGES.editor.paintMode }));
    fireEvent.click(screen.getByRole('button', { name: MESSAGES.editor.choseColor }));
    expect(screen.getByRole('dialog', { name: MESSAGES.editor.choseColor })).toBeVisible();
  });

  describe('tooltips', () => {
    it('describes a shift button', async () => {
      render(<Editor />);
      await expectTooltip(
        screen.getByRole('button', { name: MESSAGES.editor.shiftRowLeft }),
        MESSAGES.editor.tooltip.shiftRowLeft,
      );
    });

    it('describes a mode button', async () => {
      render(<Editor />);
      await expectTooltip(
        screen.getByRole('button', { name: MESSAGES.editor.editMode }),
        MESSAGES.editor.tooltip.editMode,
      );
    });

    it('describes the lights count input', async () => {
      render(<Editor />);
      await expectTooltip(
        screen.getByRole('textbox', { name: MESSAGES.editor.lightsCount }),
        MESSAGES.editor.tooltip.lightsCount,
      );
    });

    it('describes the type select and keeps its accessible name', async () => {
      render(<Editor />);
      await expectTooltip(
        screen.getByRole('combobox', { name: MESSAGES.editor.frameType }),
        MESSAGES.editor.tooltip.frameType,
      );
    });

    it('describes the tempo select and keeps its accessible name', async () => {
      render(<Editor />);
      await expectTooltip(
        screen.getByRole('combobox', { name: MESSAGES.editor.frameTempo }),
        MESSAGES.editor.tooltip.frameTempo,
      );
    });

    it('describes the scheme name input', async () => {
      render(<Editor />);
      await expectTooltip(
        screen.getByRole('textbox', { name: MESSAGES.editor.schemeName }),
        MESSAGES.editor.tooltip.schemeName,
      );
    });

    it('describes Save', async () => {
      render(<Editor />);
      await expectTooltip(screen.getByRole('button', { name: MESSAGES.editor.save }), MESSAGES.editor.tooltip.save);
    });

    it('describes the color picker trigger and recent colors, and still opens the dialog', async () => {
      render(<Editor />);
      fireEvent.click(screen.getByRole('button', { name: MESSAGES.editor.paintMode }));
      const trigger = screen.getByRole('button', { name: MESSAGES.editor.choseColor });
      await expectTooltip(trigger, MESSAGES.editor.tooltip.choseColor);
      fireEvent.click(trigger);
      expect(screen.getByRole('dialog', { name: MESSAGES.editor.choseColor })).toBeVisible();
    });

    it('describes a recent color button', async () => {
      render(<Editor />);
      fireEvent.click(screen.getByRole('button', { name: MESSAGES.editor.paintMode }));
      await expectTooltip(
        screen.getByRole('button', { name: `${MESSAGES.editor.recentColor} 1` }),
        MESSAGES.editor.tooltip.recentColor,
      );
    });

    it('describes the lights count buttons', async () => {
      render(<Editor />);
      await expectTooltip(button(MESSAGES.editor.increaseLights), MESSAGES.editor.tooltip.increaseLights);
    });
  });

  describe('disabled controls', () => {
    it('describes the disabled undo button', async () => {
      render(<Editor />);
      await expectDisabledTooltip(button(MESSAGES.editor.undo), MESSAGES.editor.tooltip.undo);
    });

    it('describes the disabled delete button of a single row scheme', async () => {
      render(<Editor lightsSchemeData={singleRow} />);
      await expectDisabledTooltip(button(MESSAGES.editor.deleteRow), MESSAGES.editor.tooltip.deleteRow);
    });

    it('describes the disabled decrease lights button', async () => {
      render(<Editor lightsSchemeData={singleRow} />);
      await expectDisabledTooltip(button(MESSAGES.editor.decreaseLights), MESSAGES.editor.tooltip.decreaseLights);
    });

    it('keeps focus on the lights decrease button when it becomes disabled', () => {
      render(<Editor lightsSchemeData={twoLights} />);
      const decrease = button(MESSAGES.editor.decreaseLights);
      act(() => decrease.focus());
      fireEvent.click(decrease);
      expect(document.activeElement).toBe(decrease);
      expect(decrease).toHaveAttribute('aria-disabled', 'true');
    });

    it('keeps the accessible name of a disabled button', () => {
      render(<Editor />);
      expect(button(MESSAGES.editor.undo)).toHaveAttribute('aria-disabled', 'true');
    });

    it('does not run the action of an aria-disabled delete button', () => {
      render(<Editor lightsSchemeData={singleRow} />);
      fireEvent.click(button(MESSAGES.editor.deleteRow));
      expect(button(MESSAGES.editor.deleteRow)).toHaveAttribute('aria-disabled', 'true');
      expect(button(MESSAGES.editor.undo)).toHaveAttribute('aria-disabled', 'true');
    });

    it('does not run undo while it is aria-disabled', () => {
      render(<Editor />);
      const lightsCount = screen.getByLabelText(MESSAGES.editor.lightsCount);
      const before = (lightsCount as HTMLInputElement).value;
      fireEvent.click(button(MESSAGES.editor.undo));
      expect((lightsCount as HTMLInputElement).value).toBe(before);
    });

    it('has no wrapper tab stops around controls', () => {
      const { container } = render(<Editor lightsSchemeData={singleRow} />);
      expect(container.querySelector('span[tabindex]')).toBeNull();
      expect(button(MESSAGES.editor.deleteRow).tagName).toBe('BUTTON');
    });
  });
});
