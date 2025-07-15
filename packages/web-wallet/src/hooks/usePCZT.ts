import { useWebZjsContext } from '../context/WebzjsContext';
import { Pczt } from '@chainsafe/webzjs-wallet';
import { useInvokeSnap } from './snaps/useInvokeSnap';
import { zecToZats } from '../utils';
import { useWebZjsActions } from './useWebzjsActions';
import { useState } from 'react';
import { SignPcztDetails } from '../types/snap';

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
  const { state } = useWebZjsContext();
  const invokeSnap = useInvokeSnap();
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

  const provePczt = async (pczt: Pczt): Promise<Pczt> => {
    try {
      return await state.webWallet!.pczt_prove(pczt);
    } catch (error) {
      console.error('Error proving PCZT:', error);
      throw error;
    }
  };

  const signPczt = async (
    pczt: Pczt,
    signDetails: { recipient: string; amount: string },
  ): Promise<string> => {
    try {
      const pcztBytes = pczt.serialize();

      const pcztHexTring = Buffer.from(pcztBytes).toString('hex');
      const params: SignPcztDetails = {
        pcztHexTring,
        signDetails,
      };

      return (await invokeSnap({
        method: 'signPczt',
        params,
      })) as string;
    } catch (error) {
      console.error('Error signing PCZT:', error);
      throw error;
    }
  };

  const sendPczt = async (signedPczt: Pczt) => {
    try {
      await state.webWallet!.pczt_send(signedPczt);
    } catch (error) {
      console.error('Error sending PCZT:', error);
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
    ) => Promise<Pczt>,
  ) => {
    if (!state.webWallet) return;
    try {
      const chainHeight = await state.webWallet.get_latest_block();
      const isSynced =
        chainHeight.toString() ===
        state.summary?.fully_scanned_height.toString();
      setPcztTransferStatus(PcztTransferStatus.CHECK_LATEST_BLOCK);
      if (!isSynced) {
        setPcztTransferStatus(PcztTransferStatus.SYNCING_CHAIN);
        await triggerRescan();
      }

      setPcztTransferStatus(PcztTransferStatus.CREATING_PCZT);
      const pczt = await createPcztFunc(accountId, toAddress, value);

      setPcztTransferStatus(PcztTransferStatus.SIGNING_PCZT);
      const pcztHexStringSigned = await signPczt(pczt, {
        recipient: toAddress,
        amount: value,
      });
      const pcztBufferSigned = Buffer.from(pcztHexStringSigned, 'hex');
      const signedPczt = Pczt.from_bytes(new Uint8Array(pcztBufferSigned));

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
