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

export interface SnapState {
  webWalletSyncStartBlock: string;
}
