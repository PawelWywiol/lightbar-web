import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Input } from './input';

describe('Input', () => {
  it('prefers the aria-label', () => {
    render(<Input aria-label="label" name="name" placeholder="placeholder" />);
    expect(screen.getByRole('textbox', { name: 'label' })).toBeInTheDocument();
  });

  it('falls back to the name, then the placeholder', () => {
    render(
      <>
        <Input name="named" placeholder="placeholder" />
        <Input placeholder="hint" />
      </>,
    );
    expect(screen.getByRole('textbox', { name: 'named' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'hint' })).toBeInTheDocument();
  });
});
