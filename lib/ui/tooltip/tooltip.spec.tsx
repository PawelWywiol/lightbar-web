import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Tooltip, TooltipProvider } from './tooltip';

const renderTooltip = () =>
  render(
    <TooltipProvider>
      <Tooltip content="Hint">
        <button type="button">Trigger</button>
      </Tooltip>
    </TooltipProvider>,
  );

const trigger = () => screen.getByRole('button', { name: 'Trigger' });

describe('Tooltip', () => {
  it('lets pointer events pass through the content', async () => {
    renderTooltip();
    fireEvent.focus(trigger());
    expect(await screen.findByRole('tooltip')).toHaveClass('pointer-events-none');
  });

  it('closes as soon as the pointer leaves the trigger', async () => {
    renderTooltip();
    fireEvent.focus(trigger());
    expect(await screen.findByRole('tooltip')).toHaveTextContent('Hint');

    fireEvent.pointerLeave(trigger());

    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('blocks the click of a disabled child and keeps it focusable', () => {
    const onClick = vi.fn();
    render(
      <TooltipProvider>
        <Tooltip content="Hint">
          <button type="button" disabled onClick={onClick}>
            Trigger
          </button>
        </Tooltip>
      </TooltipProvider>,
    );

    fireEvent.click(trigger());

    expect(onClick).not.toHaveBeenCalled();
    expect(trigger()).toHaveAttribute('aria-disabled', 'true');
    expect(trigger()).not.toBeDisabled();
  });
});
