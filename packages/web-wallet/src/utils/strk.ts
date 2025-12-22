const STRK_DECIMALS = 18;
const STRK_PER_UNIT = 10n ** BigInt(STRK_DECIMALS);

/**
 * Convert STRK amount to smallest unit (wei-like)
 * @param amount - STRK amount as string (e.g., "1.5")
 * @returns Amount in smallest unit as string
 */
export function strkToSmallestUnit(amount: string): string {
  // Handle decimal input
  const parts = amount.split('.');
  const wholePart = parts[0] || '0';
  const decimalPart = parts[1] || '';
  
  // Pad decimal part to 18 decimals
  const paddedDecimal = decimalPart.padEnd(STRK_DECIMALS, '0').slice(0, STRK_DECIMALS);
  
  // Combine and convert to BigInt
  const fullAmount = BigInt(wholePart) * STRK_PER_UNIT + BigInt(paddedDecimal || '0');
  
  return fullAmount.toString();
}

/**
 * Convert from smallest unit to STRK
 * @param amount - Amount in smallest unit as string
 * @returns STRK amount as string with decimal formatting
 */
export function smallestUnitToStrk(amount: string): string {
  const amountBigInt = BigInt(amount);
  const divisor = STRK_PER_UNIT;
  
  const wholePart = amountBigInt / divisor;
  const remainder = amountBigInt % divisor;
  
  if (remainder === 0n) {
    return wholePart.toString();
  }
  
  // Convert remainder to decimal string with proper padding
  const remainderStr = remainder.toString().padStart(STRK_DECIMALS, '0');
  // Remove trailing zeros
  const trimmedRemainder = remainderStr.replace(/0+$/, '');
  
  return `${wholePart}.${trimmedRemainder}`;
}




