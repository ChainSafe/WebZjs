import { useWebZjsContext } from '../context/WebzjsContext';
import { Pczt as WalletPczt } from '@chainsafe/webzjs-wallet';
import { zecToZats } from '../utils';
import { useWebZjsActions } from './useWebzjsActions';
import { useState } from 'react';
import {
  Pczt as KeysPczt,
  SeedFingerprint,
  UnifiedSpendingKey,
  pczt_sign,
} from '@chainsafe/webzjs-keys';
import { mnemonicToSeedSync } from '@scure/bip39';

interface IUsePczt {
  handlePcztTransaction: (
    accountId: number,
    toAddress: string,
    value: string,
  ) => void;
  handlePcztShieldTransaction: (
    accountId: number,
    toAddress: string,
    value: string,
  ) => void;
  pcztTransferStatus: PcztTransferStatus;
}

export enum PcztTransferStatus {
  CHECK_WALLET = 'Checking wallet',
  CHECK_LATEST_BLOCK = 'Checking synced block height',
  SYNCING_CHAIN = 'Syncing chain',
  CREATING_PCZT = 'Creating transaction',
  SIGNING_PCZT = 'Signing transaction',
  PROVING_PCZT = 'Proving transaction',
  SENDING_PCZT = 'Sending transaction',
  SEND_SUCCESSFUL = 'Send successful',
  SEND_ERROR = 'Send error',
}

export const usePczt = (): IUsePczt => {
  const { state, getSeedForAccount } = useWebZjsContext();
  const { triggerRescan } = useWebZjsActions();

  const [pcztTransferStatus, setPcztTransferStatus] =
    useState<PcztTransferStatus>(PcztTransferStatus.CHECK_WALLET);

  const createPCZT = async (
    accountId: number,
    toAddress: string,
    value: string,
  ) => {
    try {
      const valueinZats = zecToZats(value);
      return await state.webWallet!.pczt_create(
        accountId,
        toAddress,
        valueinZats,
      );
    } catch (error) {
      console.error('Error creating PCZT:', error);
      throw error;
    }
  };

  const provePczt = async (pczt: WalletPczt): Promise<WalletPczt> => {
    try {
      return await state.webWallet!.pczt_prove(pczt);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error('Error proving PCZT:', { msg, error });
      throw error;
    }
  };

  const signPczt = async (pczt: WalletPczt): Promise<WalletPczt> => {
    // Always derive using the HD account index used at creation (currently fixed to 0).
    const { seedPhrase, accountIndex } = await getSeedForAccount();

    const seedBytes = new Uint8Array(mnemonicToSeedSync(seedPhrase));

    // Derive using the HD account index associated with the seed (not the wallet account id).
    const usk = new UnifiedSpendingKey('main', seedBytes, accountIndex);
    const seedFp = new SeedFingerprint(seedBytes);

    // Convert wallet Pczt to keys Pczt for signing, then back.
    const keysPczt = KeysPczt.from_bytes(pczt.serialize());
    const signedKeysPczt = await pczt_sign('main', keysPczt, usk, seedFp);
    const signedWalletPczt = WalletPczt.from_bytes(signedKeysPczt.serialize());

    return signedWalletPczt;
  };

  const sendPczt = async (signedPczt: WalletPczt) => {
    try {
      // Optional debug snapshot before send; remove if too noisy
      console.debug('Sending PCZT', {
        pczt: signedPczt.to_json?.() ?? 'pczt_to_json_unavailable',
      });
      await state.webWallet!.pczt_send(signedPczt);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;
      const stringified =
        typeof error === 'object'
          ? JSON.stringify(error, null, 2)
          : String(error);
      console.error('Error sending PCZT:', { msg, stack, error, stringified });
      setPcztTransferStatus(PcztTransferStatus.SEND_ERROR);
      throw error;
    }
  };

  const handlePcztGenericTransaction = async (
    accountId: number,
    toAddress: string,
    value: string,
    createPcztFunc: (
      accountId: number,
      toAddress: string,
      value: string,
    ) => Promise<WalletPczt>,
  ) => {
    if (!state.webWallet) {
      setPcztTransferStatus(PcztTransferStatus.SEND_ERROR);
      return;
    }
    try {
      const chainHeight = await state.webWallet.get_latest_block();
      const isSynced =
        chainHeight.toString() ===
        state.summary?.fully_scanned_height.toString();
      setPcztTransferStatus(PcztTransferStatus.CHECK_LATEST_BLOCK);
      if (!isSynced) {
        setPcztTransferStatus(PcztTransferStatus.SYNCING_CHAIN);
        await triggerRescan();
        // Re-evaluate after rescan trigger
        const refreshedHeight = await state.webWallet.get_latest_block();
        const refreshedSynced =
          refreshedHeight.toString() ===
          state.summary?.fully_scanned_height.toString();
        if (!refreshedSynced) {
          setPcztTransferStatus(PcztTransferStatus.SEND_ERROR);
          return;
        }
      }

      setPcztTransferStatus(PcztTransferStatus.CREATING_PCZT);
      const pczt = await createPcztFunc(accountId, toAddress, value);

      setPcztTransferStatus(PcztTransferStatus.SIGNING_PCZT);
      const signedPczt = await signPczt(pczt);

      setPcztTransferStatus(PcztTransferStatus.PROVING_PCZT);
      const provedPczt = await provePczt(signedPczt);

      setPcztTransferStatus(PcztTransferStatus.SENDING_PCZT);
      await sendPczt(provedPczt);
      setPcztTransferStatus(PcztTransferStatus.SEND_SUCCESSFUL);

      await triggerRescan();
    } catch (error) {
      console.error(error);
      setPcztTransferStatus(PcztTransferStatus.SEND_ERROR);
    }
  };

  const handlePcztShieldTransaction = async (
    accountId: number,
    toAddress: string,
    value: string,
  ) => {
    await handlePcztGenericTransaction(
      accountId,
      toAddress,
      value,
      async (accountId) => await state.webWallet!.pczt_shield(accountId),
    );
  };

  const handlePcztTransaction = async (
    accountId: number,
    toAddress: string,
    value: string,
  ) => {
    await handlePcztGenericTransaction(accountId, toAddress, value, createPCZT);
  };

  return {
    handlePcztTransaction,
    handlePcztShieldTransaction,
    pcztTransferStatus,
  };
};
