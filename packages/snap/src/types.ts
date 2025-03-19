import { Json } from "@metamask/snaps-sdk";

export type SetBirthdayBlockParams = { latestBlock: number };

export interface SnapState extends Record<string, Json> {
  webWalletSyncStartBlock: string;
}
