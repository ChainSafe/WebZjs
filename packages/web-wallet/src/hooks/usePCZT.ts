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
  lastError: string | null;
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
  const { triggerRescan, flushDbToStore, syncStateWithWallet } = useWebZjsActions();

  const [pcztTransferStatus, setPcztTransferStatus] =
    useState<PcztTransferStatus>(PcztTransferStatus.CHECK_WALLET);
  const [lastError, setLastError] = useState<string | null>(null);

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
      console.info('Shield: About to call pczt_send');
      console.info('Shield: Signed PCZT bytes:', signedPczt.serialize().length);
      await state.webWallet!.pczt_send(signedPczt);
      console.info('Shield: pczt_send completed successfully');
    } catch (error) {
      console.error('Error sending PCZT:', error);
      console.error('Error type:', typeof error);
      console.error('Error name:', (error as Error)?.name);
      console.error('Error message:', (error as Error)?.message);
      console.error('Error stack:', (error as Error)?.stack);
      // Try to extract more info if it's a structured error
      if (error && typeof error === 'object') {
        console.error('Error keys:', Object.keys(error));
        console.error('Full error object:', JSON.stringify(error, null, 2));
      }
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
    setLastError(null); // Clear any previous error
    console.info('Shield: Starting transaction flow');
    try {
      const chainHeight = await state.webWallet.get_latest_block();
      console.info('Shield: Chain height:', chainHeight.toString());
      console.info('Shield: Fully scanned:', state.summary?.fully_scanned_height);
      const isSynced =
        chainHeight.toString() ===
        state.summary?.fully_scanned_height.toString();
      console.info('Shield: Is synced:', isSynced);
      setPcztTransferStatus(PcztTransferStatus.CHECK_LATEST_BLOCK);
      if (!isSynced) {
        console.info('Shield: Starting resync before transaction');
        setPcztTransferStatus(PcztTransferStatus.SYNCING_CHAIN);
        await triggerRescan();
        console.info('Shield: Resync complete');
      }

      setPcztTransferStatus(PcztTransferStatus.CREATING_PCZT);
      console.info('Shield: Creating PCZT for account', accountId);
      const pczt = await createPcztFunc(accountId, toAddress, value);
      const pcztBytes = pczt.serialize();
      console.info('Shield: PCZT created, size:', pcztBytes.length, 'bytes');

      setPcztTransferStatus(PcztTransferStatus.SIGNING_PCZT);
      console.info('Shield: Sending to snap for signing');
      const pcztHexStringSigned = await signPczt(pczt, {
        recipient: toAddress,
        amount: value,
      });
      const pcztBufferSigned = Buffer.from(pcztHexStringSigned, 'hex');
      console.info('Shield: Signed PCZT received, size:', pcztBufferSigned.length, 'bytes');
      const signedPczt = Pczt.from_bytes(new Uint8Array(pcztBufferSigned));
      console.info('Shield: Signed PCZT parsed successfully');

      setPcztTransferStatus(PcztTransferStatus.PROVING_PCZT);
      console.info('Shield: Starting proof generation');
      const provedPczt = await provePczt(signedPczt);
      console.info('Shield: Proof generated successfully');

      setPcztTransferStatus(PcztTransferStatus.SENDING_PCZT);
      console.info('Shield: Broadcasting transaction');
      await sendPczt(provedPczt);
      console.info('Shield: Transaction broadcast complete');

      // Persist wallet state immediately after broadcast to prevent data loss on crash
      await flushDbToStore();
      console.info('Shield: Wallet state persisted');

      // Log transaction history for debugging pending transaction detection
      try {
        const history = await state.webWallet.get_transaction_history(accountId, 5, 0);
        console.info('Shield: Transaction history after broadcast:', history.transactions.map(tx => ({
          txid: tx.txid,
          status: tx.status,
          tx_type: tx.tx_type,
        })));
      } catch (e) {
        console.warn('Shield: Could not fetch tx history after broadcast:', e);
      }

      setPcztTransferStatus(PcztTransferStatus.SEND_SUCCESSFUL);

      // Refresh wallet state — totalBalance now includes pending amounts,
      // so the displayed balance stays correct without special post-tx handling
      await syncStateWithWallet();

      // Trigger background rescan to pick up the pending transaction when mined
      await triggerRescan();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Transaction error:', errorMessage);
      setLastError(errorMessage);
      setPcztTransferStatus(PcztTransferStatus.SEND_ERROR);
      // Rescan to detect notes are still unspent on-chain
      // This prevents the "stuck funds" issue when broadcast fails
      try {
        await triggerRescan();
      } catch (rescanError) {
        console.error('Rescan after error failed:', rescanError);
      }
    }
  };

  const handlePcztShieldTransaction = async (
    accountId: number,
    toAddress: string,
    value: string,
  ) => {
    console.info('Shield: handlePcztShieldTransaction called for account', accountId);
    console.info('Shield: toAddress (unused for shield):', toAddress);
    console.info('Shield: value (unused for shield):', value);
    await handlePcztGenericTransaction(
      accountId,
      toAddress,
      value,
      async (accountId) => {
        console.info('Shield: Calling pczt_shield on wallet for account', accountId);
        const pczt = await state.webWallet!.pczt_shield(accountId);
        console.info('Shield: pczt_shield returned successfully');
        return pczt;
      },
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
    lastError,
  };
};
