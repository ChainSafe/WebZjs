function hexStringToUint8Array(hex: string): Uint8Array {
    if (hex.length % 2 !== 0) {
        throw new Error('Invalid hex string: length must be even');
    }
    const uint8Array = new Uint8Array(hex.length / 2);
    for (let i = 0; i < uint8Array.length; i++) {
        uint8Array[i] = parseInt(hex.substr(i * 2, 2), 16);
    }
    return uint8Array;
}