import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { TransferInput } from './TransferInput';

describe('TransferInput', () => {
  const mockNextStep = vi.fn();
  const mockHandleChange = vi.fn(() => vi.fn());

  const defaultProps = {
    formData: {
      recipient: '',
      transactionType: 'internal' as const,
      amount: '',
    },
    handleChange: mockHandleChange,
    nextStep: mockNextStep,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders recipient and amount inputs', () => {
    render(<TransferInput {...defaultProps} />);

    expect(screen.getByLabelText('To:')).toBeInTheDocument();
    expect(screen.getByLabelText('Amount:')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Continue' })).toBeInTheDocument();
  });

  it('shows error for empty recipient', () => {
    render(
      <TransferInput
        {...defaultProps}
        formData={{ ...defaultProps.formData, recipient: '', amount: '1' }}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    expect(screen.getByText('Please enter a valid address')).toBeInTheDocument();
    expect(mockNextStep).not.toHaveBeenCalled();
  });

  it('shows error for empty amount', () => {
    render(
      <TransferInput
        {...defaultProps}
        formData={{ ...defaultProps.formData, recipient: 'zs1test...', amount: '' }}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    expect(screen.getByText('Please enter an valid amount to transfer')).toBeInTheDocument();
    expect(mockNextStep).not.toHaveBeenCalled();
  });

  it('shows error for invalid amount (NaN)', () => {
    render(
      <TransferInput
        {...defaultProps}
        formData={{ ...defaultProps.formData, recipient: 'zs1test...', amount: 'abc' }}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    expect(screen.getByText('Please enter an valid amount to transfer')).toBeInTheDocument();
    expect(mockNextStep).not.toHaveBeenCalled();
  });

  it('shows error for zero amount', () => {
    render(
      <TransferInput
        {...defaultProps}
        formData={{ ...defaultProps.formData, recipient: 'zs1test...', amount: '0' }}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    expect(screen.getByText('Please enter an valid amount to transfer')).toBeInTheDocument();
    expect(mockNextStep).not.toHaveBeenCalled();
  });

  it('shows error for negative amount', () => {
    render(
      <TransferInput
        {...defaultProps}
        formData={{ ...defaultProps.formData, recipient: 'zs1test...', amount: '-5' }}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    expect(screen.getByText('Please enter an valid amount to transfer')).toBeInTheDocument();
    expect(mockNextStep).not.toHaveBeenCalled();
  });

  it('calls nextStep when validation passes', () => {
    render(
      <TransferInput
        {...defaultProps}
        formData={{
          ...defaultProps.formData,
          recipient: 'zs1validaddress123',
          amount: '1.5',
        }}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    expect(mockNextStep).toHaveBeenCalledTimes(1);
  });

  it('shows both errors when both fields are invalid', () => {
    render(
      <TransferInput
        {...defaultProps}
        formData={{ ...defaultProps.formData, recipient: '', amount: '' }}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    expect(screen.getByText('Please enter a valid address')).toBeInTheDocument();
    expect(screen.getByText('Please enter an valid amount to transfer')).toBeInTheDocument();
    expect(mockNextStep).not.toHaveBeenCalled();
  });

  it('calls handleChange when recipient input changes', () => {
    const mockFn = vi.fn();
    const mockHandleChangeWithFn = vi.fn(() => mockFn);

    render(
      <TransferInput
        {...defaultProps}
        handleChange={mockHandleChangeWithFn}
      />
    );

    const recipientInput = screen.getByLabelText('To:');
    fireEvent.change(recipientInput, { target: { value: 'zs1newaddress' } });

    expect(mockHandleChangeWithFn).toHaveBeenCalledWith('recipient');
    expect(mockFn).toHaveBeenCalled();
  });

  it('calls handleChange when amount input changes', () => {
    const mockFn = vi.fn();
    const mockHandleChangeWithFn = vi.fn(() => mockFn);

    render(
      <TransferInput
        {...defaultProps}
        handleChange={mockHandleChangeWithFn}
      />
    );

    const amountInput = screen.getByLabelText('Amount:');
    fireEvent.change(amountInput, { target: { value: '2.5' } });

    expect(mockHandleChangeWithFn).toHaveBeenCalledWith('amount');
    expect(mockFn).toHaveBeenCalled();
  });
});
