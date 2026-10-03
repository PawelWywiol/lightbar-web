import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
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
});
