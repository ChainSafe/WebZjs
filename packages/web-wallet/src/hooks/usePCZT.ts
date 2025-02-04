import { useWebZjsContext } from '../context/WebzjsContext';
import { Pczt } from '@webzjs/webz-wallet';
import { useInvokeSnap } from './snaps/useInvokeSnap';

interface PcztActions {}

export function usePczt(): PcztActions {
  const { state } = useWebZjsContext();
  const invokeSnap = useInvokeSnap();

  const createPCZT = async (
    accountId: number,
    toAddress: string,
    value: bigint,
  ) => {
    try {
      return await state.webWallet?.pczt_create(accountId, toAddress, value);
    } catch (error) {
      console.error('Error creating PCZT:', error);
    }
  };

  const provePczt = (pczt: Pczt) => async () => {
    try {
      await state.webWallet?.pczt_prove(pczt, null);
    } catch (error) {
      console.error('Error proving PCZT:', error);
    }
  };

  const signPczt = (pczt: Pczt) => async () => {
    const signedPczt = await invokeSnap({
      method: 'signPczt',
      params: { pczt },
    });
  };

  const sendPczt = (signedPczt: Pczt) => async () => {
    await state.webWallet?.pczt_send(signedPczt);
  };

  return {};
}
