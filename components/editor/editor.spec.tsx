import { fireEvent, render, screen } from '@testing-library/react';
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

const expectTooltip = async (control: HTMLElement, text: string) => {
  fireEvent.focus(control);
  expect(await screen.findByRole('tooltip')).toHaveTextContent(text);
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
      const button = screen.getByRole('button', { name });
      expect(canvas.compareDocumentPosition(button) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
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
  });
});
