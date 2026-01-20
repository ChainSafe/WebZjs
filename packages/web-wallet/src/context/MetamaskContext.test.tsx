import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { MetaMaskProvider, useMetaMaskContext } from './MetamaskContext';

// Mock getSnapsProvider
vi.mock('../utils', () => ({
  getSnapsProvider: vi.fn().mockResolvedValue(null),
}));

describe('MetamaskContext', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <MetaMaskProvider>{children}</MetaMaskProvider>
  );

  it('should initialize with isPendingRequest as false', () => {
    const { result } = renderHook(() => useMetaMaskContext(), { wrapper });
    expect(result.current.isPendingRequest).toBe(false);
  });

  it('should set isPendingRequest to true when error has code -32002', async () => {
    const { result } = renderHook(() => useMetaMaskContext(), { wrapper });

    const pendingError = new Error('Pending request');
    (pendingError as any).code = -32002;

    await act(async () => {
      result.current.setError(pendingError);
      // Allow useEffect to run
      await vi.runAllTimersAsync();
    });

    expect(result.current.isPendingRequest).toBe(true);
  });

  it('should set isPendingRequest to true when error has isPendingRequest flag', async () => {
    const { result } = renderHook(() => useMetaMaskContext(), { wrapper });

    const pendingError = new Error('Pending request');
    (pendingError as any).isPendingRequest = true;

    await act(async () => {
      result.current.setError(pendingError);
    });

    expect(result.current.isPendingRequest).toBe(true);
  });

  it('should NOT set isPendingRequest for regular errors', async () => {
    const { result } = renderHook(() => useMetaMaskContext(), { wrapper });

    // Verify initial state
    expect(result.current.isPendingRequest).toBe(false);

    const regularError = new Error('Some other error');

    await act(async () => {
      result.current.setError(regularError);
      // Let useEffect run
      await Promise.resolve();
    });

    expect(result.current.error).toBe(regularError);
    // Regular errors should NOT set isPendingRequest to true
    expect(result.current.isPendingRequest).toBe(false);
  });

  it('should clear error and isPendingRequest after 10 seconds', async () => {
    const { result } = renderHook(() => useMetaMaskContext(), { wrapper });

    const pendingError = new Error('Pending request');
    (pendingError as any).code = -32002;

    await act(async () => {
      result.current.setError(pendingError);
    });

    expect(result.current.isPendingRequest).toBe(true);
    expect(result.current.error).toBeTruthy();

    // Fast-forward 10 seconds
    await act(async () => {
      vi.advanceTimersByTime(10000);
    });

    expect(result.current.error).toBeNull();
    expect(result.current.isPendingRequest).toBe(false);
  });

  it('should allow manual setting of isPendingRequest', async () => {
    const { result } = renderHook(() => useMetaMaskContext(), { wrapper });

    await act(async () => {
      result.current.setIsPendingRequest(true);
    });

    expect(result.current.isPendingRequest).toBe(true);

    await act(async () => {
      result.current.setIsPendingRequest(false);
    });

    expect(result.current.isPendingRequest).toBe(false);
  });

  it('should reset isPendingRequest when error is cleared via timeout', async () => {
    const { result } = renderHook(() => useMetaMaskContext(), { wrapper });

    const pendingError = new Error('Pending request');
    (pendingError as any).code = -32002;

    await act(async () => {
      result.current.setError(pendingError);
    });

    expect(result.current.isPendingRequest).toBe(true);

    // Advance timer to clear error
    await act(async () => {
      vi.advanceTimersByTime(10000);
    });

    expect(result.current.isPendingRequest).toBe(false);
    expect(result.current.error).toBeNull();
  });
});
