import type { Json } from '@metamask/snaps-sdk';

export type SetBirthdayBlockParams = { latestBlock: number };

export type SignPcztParams = { pcztHexTring: string };

export interface SnapState extends Record<string, Json> {
  webWalletSyncStartBlock: string;
}
