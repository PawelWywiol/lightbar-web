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
    expect(canvas.parentElement?.previousElementSibling).toBeNull();
  });

  it('opens the color dialog from the full-width paint trigger', () => {
    render(<Editor />);
    fireEvent.click(screen.getByRole('button', { name: MESSAGES.editor.paintMode }));
    const trigger = screen.getByRole('button', { name: MESSAGES.editor.choseColor });
    expect(trigger).toHaveClass('flex-1');
    fireEvent.click(trigger);
    expect(screen.getByText(MESSAGES.editor.choseColor, { selector: 'span' })).toBeVisible();
  });
});
