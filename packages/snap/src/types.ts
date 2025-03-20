import { Json } from "@metamask/snaps-sdk";

export type SetBirthdayBlockParams = { latestBlock: number };

export type SignPcztParams = { pcztJsonStringified: string };

export interface SnapState extends Record<string, Json> {
  webWalletSyncStartBlock: string;
}
