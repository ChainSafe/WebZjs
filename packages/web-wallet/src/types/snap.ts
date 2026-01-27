export type GetSnapsResponse = Record<string, Snap>;

export type Snap = {
  permissionName: string;
  id: string;
  version: string;
  initialPermissions: Record<string, unknown>;
};

export type SignPcztDetails = {
  pcztHexTring: string;
  signDetails: {
    recipient: string;
    amount: string;
  };
};

/**
 * Cached balance stored in snap state for recovery after cookie/IndexedDB clears.
 */
export type LastKnownBalance = {
  shielded: number;     // sapling + orchard (in zats)
  unshielded: number;   // transparent (in zats)
  timestamp: number;    // When last updated (ms)
};

/**
 * Snap persistent state stored via snap_manageState.
 * Uses `| null` instead of optional to match snap's Json-compatible type.
 */
export interface SnapState {
  webWalletSyncStartBlock: string;
  lastKnownBalance: LastKnownBalance | null;
  hasPendingTx: boolean | null;
}
