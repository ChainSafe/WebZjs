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

  const signPczt = async (pczt: Pczt): Promise<string> => {

    const pcztBytes = pczt.serialize();

    console.log("pcztBytes")
    console.log(pcztBytes)

    const pcztHexTring = Buffer.from(pcztBytes).toString('hex');

    
    console.log('unsignedPcztHexTring_________________');
    console.log(pcztHexTring);


    return (await invokeSnap({
      method: 'signPczt',
      params: { pcztHexTring },
    }) as string);
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

    const pczt = await createPCZT(accountId, toAddress, valueinZats);

    if (pczt) {
      const pcztHexStringSigned = await signPczt(pczt);

      console.log('pcztHexStringSigned_____________');
      console.log(pcztHexStringSigned);

      const pcztBufferSigned = Buffer.from(pcztHexStringSigned, 'hex');

      console.log("pcztBufferSigned")
      console.log(pcztBufferSigned)

      const pcztUint8ArraySigned = new Uint8Array(pcztBufferSigned);

      console.log("pcztUint8ArraySigned")
      console.log(pcztUint8ArraySigned)

      const signedPczt = Pczt.from_bytes(pcztUint8ArraySigned)

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
