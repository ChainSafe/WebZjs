import { Decimal } from 'decimal.js';

const ZATS_PER_ZEC = 100_000_000;

function zatsToZec(zats: number): number {
  return zats / ZATS_PER_ZEC;
}

function zecToZats(zecString: string): bigint {
  if (!zecString || isNaN(Number(zecString))) {
    throw new Error('Invalid ZEC amount provided.');
  }

  const zecDecimal = new Decimal(zecString);
  const zatsDecimal = zecDecimal.times(ZATS_PER_ZEC);

  // Ensure the result is an integer
  if (!zatsDecimal.isInteger()) {
    throw new Error('Resulting zats value is not an integer.');
  }

  return BigInt(zatsDecimal.toFixed(0));
}

export { zatsToZec, zecToZats };
