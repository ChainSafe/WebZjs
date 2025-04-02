import { Decimal } from 'decimal.js';

const ZATS_PER_ZEC = 100_000_000;

function zatsToZec(zats: number): number {
  return zats / ZATS_PER_ZEC;
}

function zecToZats(zecAmount: string): bigint {

  if (!/^\d+(\.\d+)?$/.test(zecAmount)) {
    throw new Error('Invalid ZEC format: must be positive number');
  }

  const amount = new Decimal(zecAmount);

  if (amount.decimalPlaces() > 8) {
    throw new Error('Maximum 8 decimal places allowed');
  }

  const zats = amount.mul(100_000_000).toDecimalPlaces(0, Decimal.ROUND_DOWN);
  return BigInt(zats.toFixed());
}

export { zatsToZec, zecToZats };