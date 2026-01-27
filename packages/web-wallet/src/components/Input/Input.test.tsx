import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import Input from './Input';

describe('Input', () => {
  it('renders input with correct id', () => {
    render(<Input id="test-input" />);

    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('id', 'test-input');
  });

  it('renders label with correct htmlFor attribute', () => {
    render(<Input id="my-input" label="My Label" />);

    const label = screen.getByText('My Label');
    expect(label).toHaveAttribute('for', 'my-input');
  });

  it('does not render label when not provided', () => {
    render(<Input id="test-input" />);

    expect(screen.queryByRole('label')).not.toBeInTheDocument();
  });

  it('renders error message when error prop is provided', () => {
    render(<Input id="test-input" error="This field is required" />);

    expect(screen.getByText('This field is required')).toBeInTheDocument();
  });

  it('does not render error message when error prop is empty', () => {
    render(<Input id="test-input" error="" />);

    expect(screen.queryByText(/./)).not.toBeInTheDocument(); // No text content from error
  });

  it('does not render error message when error prop is not provided', () => {
    render(<Input id="test-input" />);

    // ErrorMessage component doesn't render anything when text is undefined
    const container = document.querySelector('.flex.flex-col');
    expect(container?.querySelector('.text-red-500')).not.toBeInTheDocument();
  });

  it('renders suffix text', () => {
    render(<Input id="test-input" suffix="ZEC" />);

    expect(screen.getByText('ZEC')).toBeInTheDocument();
  });

  it('sets aria-describedby correctly', () => {
    render(<Input id="amount" suffix="ZEC" />);

    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('aria-describedby', 'amount-suffix');
  });

  it('suffix element has correct id for aria-describedby', () => {
    render(<Input id="amount" suffix="ZEC" />);

    const suffix = screen.getByText('ZEC');
    expect(suffix).toHaveAttribute('id', 'amount-suffix');
  });

  it('applies custom containerClassName', () => {
    const { container } = render(
      <Input id="test-input" containerClassName="custom-container" />
    );

    expect(container.querySelector('.custom-container')).toBeInTheDocument();
  });

  it('applies custom labelClassName', () => {
    render(<Input id="test-input" label="Test" labelClassName="custom-label" />);

    const label = screen.getByText('Test');
    expect(label).toHaveClass('custom-label');
  });

  it('applies custom inputClassName', () => {
    render(<Input id="test-input" inputClassName="custom-input" />);

    const input = screen.getByRole('textbox');
    expect(input).toHaveClass('custom-input');
  });

  it('passes through HTML input attributes', () => {
    render(
      <Input
        id="test-input"
        placeholder="Enter value"
        type="text"
        disabled
        maxLength={50}
      />
    );

    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('placeholder', 'Enter value');
    expect(input).toBeDisabled();
    expect(input).toHaveAttribute('maxLength', '50');
  });

  it('handles onChange events', () => {
    const handleChange = vi.fn();
    render(<Input id="test-input" onChange={handleChange} />);

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'new value' } });

    expect(handleChange).toHaveBeenCalledTimes(1);
  });

  it('displays value correctly', () => {
    render(<Input id="test-input" value="test value" onChange={() => {}} />);

    const input = screen.getByRole('textbox');
    expect(input).toHaveValue('test value');
  });
});
