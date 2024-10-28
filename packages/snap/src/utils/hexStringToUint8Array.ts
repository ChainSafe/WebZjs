/**
 * Converts a hexadecimal string to a Uint8Array.
 * @param hexString - The hexadecimal string to convert.
 * @returns A Uint8Array representing the binary data of the hex string.
 * @throws Will throw an error if the input string contains non-hex characters or has an odd length.
 */
export function hexStringToUint8Array(hexString: string): Uint8Array {
  // Remove any leading "0x" or "0X" if present
  if (hexString.startsWith('0x') || hexString.startsWith('0X')) {
    hexString = hexString.slice(2);
  }

  // Validate that the string contains only hexadecimal characters
  if (!/^[0-9a-fA-F]*$/.test(hexString)) {
    throw new Error('Hex string contains invalid characters');
  }

  if (hexString.length % 2 !== 0) {
    throw new Error('Hex string must have an even length');
  }

  const byteArray = new Uint8Array(hexString.length / 2);

  for (let i = 0; i < byteArray.length; i++) {
    const byte = hexString.slice(i * 2, i * 2 + 2);
    const byteValue = parseInt(byte, 16);

    if (isNaN(byteValue)) {
      throw new Error(`Invalid hex byte: "${byte}"`);
    }

    byteArray[i] = byteValue;
  }

  return byteArray;
}
