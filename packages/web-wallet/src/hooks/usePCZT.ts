import { useWebZjsContext } from '../context/WebzjsContext';
import { Pczt } from '@webzjs/webz-wallet';
import { useInvokeSnap } from './snaps/useInvokeSnap';
import { zecToZats } from '../utils';
import { Json } from '@metamask/snaps-sdk';

interface PcztActions {
  handlePcztTransaction: (
    accountId: number,
    toAddress: string,
    value: string,
  ) => void;
}

function bigIntReplacer(_key: string, value: any): any {
  return typeof value === 'bigint' ? value.toString() : value;
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

  const signPczt = async (pczt: Pczt): Promise<any> => {

    const pcztObject = pczt.to_json()

    console.log("pcztObject")
    console.log(pcztObject)

    const pcztJsonStringified: string = JSON.stringify(pcztObject, bigIntReplacer);

    

    console.log('unsignedPcztJsonStringified_________________');
    console.log(pcztJsonStringified);
    console.log(typeof pcztJsonStringified);



    return (await invokeSnap({
      method: 'signPczt',
      params: { pcztJsonStringified },
    }));
  };

  const sendPczt = async (signedPczt: Pczt) => {
    await state.webWallet!.pczt_send(signedPczt);
  };

  const handlePcztTransaction = async (
    accountId: number,
    toAddress: string,
    value: string,
  ) => {
    checkWebWallet();

    const valueinZats = zecToZats(value);

    console.log("accountId")
    console.log(accountId)
    console.log("toAddress")
    console.log(toAddress)
    console.log("valueinZats")
    console.log(valueinZats)

    console.log("state.summary")
    console.log(state.summary)
    console.log(state.summary?.account_balances)

    const pczt = await createPCZT(1, toAddress, valueinZats);

    if (pczt) {
      const signedPcztJson = await signPczt(pczt);

      console.log('signedPcztJson______');
      console.log(signedPcztJson);

      const signedPczt = Pczt.from_json(signedPcztJson);

      console.log('signedPczt_____________');
      console.log(signedPczt);

      const provedPczt = await provePczt(signedPczt);

      console.log('provedPcz_____________');
      console.log(provedPczt);

      await sendPczt(provedPczt);

      console.log("sent")
    }
  };

  return { handlePcztTransaction };
};
