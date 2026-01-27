import { describe, it, expect } from 'vitest';
import { zatsToZec } from './zatsToZec';

describe('zatsToZec', () => {
  it('converts 100000000 zats to 1 ZEC', () => {
    expect(zatsToZec(100_000_000)).toBe(1);
  });

  it('converts 0 zats to 0 ZEC', () => {
    expect(zatsToZec(0)).toBe(0);
  });

  it('converts 50000000 zats to 0.5 ZEC', () => {
    expect(zatsToZec(50_000_000)).toBe(0.5);
  });

  it('converts 1 zat to 0.00000001 ZEC', () => {
    expect(zatsToZec(1)).toBe(0.00000001);
  });

  it('handles very small amounts (100 zats)', () => {
    expect(zatsToZec(100)).toBe(0.000001);
  });

  it('handles very large amounts (10 billion zats = 100 ZEC)', () => {
    expect(zatsToZec(10_000_000_000)).toBe(100);
  });

  it('handles decimal precision correctly', () => {
    // 12345678 zats = 0.12345678 ZEC
    expect(zatsToZec(12_345_678)).toBe(0.12345678);
  });

  it('handles typical transaction amounts', () => {
    // 1.5 ZEC = 150000000 zats
    expect(zatsToZec(150_000_000)).toBe(1.5);
  });

  it('handles minimum shielding amount (0.001 ZEC = 100000 zats)', () => {
    expect(zatsToZec(100_000)).toBe(0.001);
  });

  it('handles amounts less than minimum shielding (99999 zats)', () => {
    expect(zatsToZec(99_999)).toBe(0.00099999);
  });

  it('handles 21 million ZEC (total supply) in zats', () => {
    // 21 million ZEC = 2.1 quadrillion zats
    const totalSupplyZats = 21_000_000 * 100_000_000;
    expect(zatsToZec(totalSupplyZats)).toBe(21_000_000);
  });
});
