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

  it('labels the header shift buttons', () => {
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
    labels.forEach((name) => expect(screen.getByRole('button', { name })).toBeInTheDocument());
  });
});
