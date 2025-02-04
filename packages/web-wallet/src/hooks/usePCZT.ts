import { useWebZjsContext } from '../context/WebzjsContext';
import { Pczt } from '@webzjs/webz-wallet';
import { useInvokeSnap } from './snaps/useInvokeSnap';

interface PcztActions {
  handlePcztTransaction: (
    accountId: number,
    toAddress: string,
    value: bigint,
  ) => void;
}

export const usePczt = (): PcztActions => {
  const { state } = useWebZjsContext();
  const invokeSnap = useInvokeSnap();

  const checkWebWallet = () => {
    if (!state.webWallet) {
      throw new Error('Web Wallet not initialized');
    }
  };

  const createPCZT = async (
    accountId: number,
    toAddress: string,
    value: bigint,
  ) => {
    try {
      return await state.webWallet!.pczt_create(accountId, toAddress, value);
    } catch (error) {
      console.error('Error creating PCZT:', error);
    }
  };

  const provePczt = async (pczt: Pczt): Promise<Pczt> => {
    try {
      return await state.webWallet!.pczt_prove(pczt);
    } catch (error) {
      console.error('Error proving PCZT:', error);
      throw new Error('Error proving PCZT');
    }
  };

  const signPczt = async (pczt: Pczt): Promise<Pczt> => {
    return (await invokeSnap({
      method: 'signPczt',
      params: { pczt },
    })) as Pczt;
  };

  const sendPczt = async (signedPczt: Pczt) => {
    await state.webWallet!.pczt_send(signedPczt);
  };

  const handlePcztTransaction = async (
    accountId: number,
    toAddress: string,
    value: bigint,
  ) => {
    checkWebWallet();
    debugger;
    const pczt = await createPCZT(accountId, toAddress, value);
    if (pczt) {
      const provedPczt = await provePczt(pczt);
      const signedPczt = await signPczt(provedPczt);
      await sendPczt(signedPczt);
    }
  };

  return { handlePcztTransaction };
};
