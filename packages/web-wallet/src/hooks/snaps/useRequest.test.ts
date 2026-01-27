import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useRequest } from './useRequest';

// Mock the MetaMaskContext
const mockSetError = vi.fn();
const mockProvider = {
  request: vi.fn(),
};

vi.mock('../../context/MetamaskContext', () => ({
  useMetaMaskContext: () => ({
    provider: mockProvider,
    setError: mockSetError,
  }),
}));

describe('useRequest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return data on successful request', async () => {
    const mockData = { result: 'success' };
    mockProvider.request.mockResolvedValueOnce(mockData);

    const { result } = renderHook(() => useRequest());
    const data = await result.current({ method: 'test_method', params: [] });

    expect(data).toEqual(mockData);
    expect(mockSetError).not.toHaveBeenCalled();
  });

  it('should return null when provider returns undefined', async () => {
    mockProvider.request.mockResolvedValueOnce(undefined);

    const { result } = renderHook(() => useRequest());
    const data = await result.current({ method: 'test_method', params: [] });

    expect(data).toBeNull();
  });

  it('should handle generic errors', async () => {
    const genericError = new Error('Generic error');
    mockProvider.request.mockRejectedValueOnce(genericError);

    const { result } = renderHook(() => useRequest());

    await expect(result.current({ method: 'test_method', params: [] })).rejects.toThrow('Generic error');
    expect(mockSetError).toHaveBeenCalledWith(genericError);
  });

  describe('pending request error handling (code -32002)', () => {
    it('should detect -32002 error code and create enriched error', async () => {
      const pendingError = { code: -32002, message: 'Request already pending' };
      mockProvider.request.mockRejectedValueOnce(pendingError);

      const { result } = renderHook(() => useRequest());

      await expect(result.current({ method: 'wallet_requestPermissions', params: [] })).rejects.toThrow(
        'A MetaMask request is already pending'
      );

      // Verify setError was called with enriched error
      expect(mockSetError).toHaveBeenCalledTimes(1);
      const errorArg = mockSetError.mock.calls[0][0];
      expect(errorArg.code).toBe(-32002);
      expect(errorArg.isPendingRequest).toBe(true);
      expect(errorArg.message).toContain('A MetaMask request is already pending');
    });

    it('should include helpful message in pending error', async () => {
      const pendingError = { code: -32002, message: 'Request already pending' };
      mockProvider.request.mockRejectedValueOnce(pendingError);

      const { result } = renderHook(() => useRequest());

      try {
        await result.current({ method: 'test_method', params: [] });
      } catch (error: any) {
        expect(error.message).toContain('approve or reject the pending request');
      }
    });

    it('should preserve isPendingRequest flag on thrown error', async () => {
      const pendingError = { code: -32002, message: 'Request already pending' };
      mockProvider.request.mockRejectedValueOnce(pendingError);

      const { result } = renderHook(() => useRequest());

      try {
        await result.current({ method: 'test_method', params: [] });
        expect.fail('Should have thrown');
      } catch (error: any) {
        expect(error.isPendingRequest).toBe(true);
        expect(error.code).toBe(-32002);
      }
    });
  });
});
