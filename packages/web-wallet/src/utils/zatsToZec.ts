const ZATS_PER_ZEC = 100_000_000;

export function zatsToZec(zats: number): number {
  return zats / ZATS_PER_ZEC;
}
