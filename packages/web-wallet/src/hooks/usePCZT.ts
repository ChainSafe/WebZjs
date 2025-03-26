import { useWebZjsContext } from '../context/WebzjsContext';
import { Pczt } from '@webzjs/webz-wallet';
import { useInvokeSnap } from './snaps/useInvokeSnap';
import { zecToZats } from '../utils';
import { useWebZjsActions } from './useWebzjsActions';
import { useState } from 'react';

interface IUsePczt {
  handlePcztTransaction: (
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
    value: bigint,
  ) => {
    try {
      return await state.webWallet!.pczt_create(accountId, toAddress, value);
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

  const signPczt = async (pczt: Pczt): Promise<string> => {
    try {
      const pcztBytes = pczt.serialize();

      const pcztHexTring = Buffer.from(pcztBytes).toString('hex');

      return (await invokeSnap({
        method: 'signPczt',
        params: { pcztHexTring },
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

  const handlePcztTransaction = async (
    accountId: number,
    toAddress: string,
    value: string,
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

      //Creating PCZT
      setPcztTransferStatus(PcztTransferStatus.CREATING_PCZT);
      const valueinZats = zecToZats(value);
      const pczt = await createPCZT(accountId, toAddress, valueinZats);

      //Signing PCZT
      setPcztTransferStatus(PcztTransferStatus.SIGNING_PCZT);
      const pcztHexStringSigned = await signPczt(pczt);

      const pcztBufferSigned = Buffer.from(pcztHexStringSigned, 'hex');

      const pcztUint8ArraySigned = new Uint8Array(pcztBufferSigned);

      const signedPczt = Pczt.from_bytes(pcztUint8ArraySigned);

      //Proving PCZT
      setPcztTransferStatus(PcztTransferStatus.PROVING_PCZT);
      const provedPczt = await provePczt(signedPczt);

      //Sending PCZT
      setPcztTransferStatus(PcztTransferStatus.SENDING_PCZT);
      await sendPczt(provedPczt);
      setPcztTransferStatus(PcztTransferStatus.SEND_SUCCESSFUL);

      await triggerRescan();
    } catch (error) {
      console.error(error);
      setPcztTransferStatus(PcztTransferStatus.SEND_ERROR)
    }
  };

  return { handlePcztTransaction, pcztTransferStatus };
};
