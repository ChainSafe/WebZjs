import type { Json } from '@metamask/snaps-sdk';

export type SetBirthdayBlockParams = { latestBlock: number };

export type SignPcztParams = {
  pcztHexTring: string;
  signDetails: {
    recipient: string;
    amount: string;
  };
};

export type SignTransparentParams = {
  derivationPath: string;
  sighashes: string[];
  details: {
    toAddress: string;
    amount: string;
    network: string;
  };
  metadata?: {
    redeemScript?: string;
  };
};

export type TransparentPublicKeyParams = {
  derivationPath: string;
};

export type TransparentNetwork = 'mainnet' | 'testnet';

export type SignTransparentMessageParams = {
  derivationPath: string;
  message: string;
  network?: TransparentNetwork;
  expectedAddress?: string;
};

export type SignTransparentMessageResult = {
  signature: string;
  address: string;
  publicKey: string;
  message: string;
  derivationPath: string;
  network: TransparentNetwork;
};

export interface SnapState extends Record<string, Json> {
  webWalletSyncStartBlock: string;
}
