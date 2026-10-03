import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Button } from './button';

describe('Button', () => {
  it('neutralizes the hover style while aria-disabled', () => {
    render(<Button aria-disabled="true">Action</Button>);
    expect(screen.getByRole('button', { name: 'Action' })).toHaveClass(
      'aria-disabled:hover:bg-background',
      'aria-disabled:hover:text-foreground',
    );
  });
});
