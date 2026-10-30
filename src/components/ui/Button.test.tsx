import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import Button from './Button';

describe('Button', () => {
  it('auto-generates title from aria-label for icon buttons', () => {
    const label = 'Settings';
    render(<Button size="icon" aria-label={label} />);
    const button = screen.getByRole('button', { name: label });
    expect(button).toHaveAttribute('title', label);
  });

  it('allows explicit title to override auto-generated one', () => {
    const label = 'Settings';
    const customTitle = 'Custom Title';
    render(<Button size="icon" aria-label={label} title={customTitle} />);
    const button = screen.getByRole('button', { name: label });
    expect(button).toHaveAttribute('title', customTitle);
  });

  it('does not apply title for non-icon buttons', () => {
    render(<Button>Text</Button>);
    const button = screen.getByRole('button', { name: 'Text' });
    expect(button).not.toHaveAttribute('title');
  });
});
