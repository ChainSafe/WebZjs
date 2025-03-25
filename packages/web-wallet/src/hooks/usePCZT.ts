import { useWebZjsContext } from '../context/WebzjsContext';
import { Pczt } from '@webzjs/webz-wallet';
import { useInvokeSnap } from './snaps/useInvokeSnap';
import { zecToZats } from '../utils';
import { useWebZjsActions } from './useWebzjsActions';

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
  const { triggerRescan } = useWebZjsActions();

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

    console.log('pcztBytes');
    console.log(pcztBytes);

    const pcztHexTring = Buffer.from(pcztBytes).toString('hex');

    console.log('unsignedPcztHexTring_________________');
    console.log(pcztHexTring);

    return (await invokeSnap({
      method: 'signPczt',
      params: { pcztHexTring },
    })) as string;
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

    console.log('accountId');
    console.log(accountId);
    console.log('toAddress');
    console.log(toAddress);
    console.log('valueinZats');
    console.log(valueinZats);

    console.log('state.summary');
    console.log(state.summary);
    console.log(state.summary?.account_balances);

    const chainHeight = await state.webWallet!.get_latest_block();

    console.log('chain heigthetetete');
    console.log(chainHeight);

    const isSynced =
      chainHeight.toString() === state.summary?.fully_scanned_height.toString();
    console.log('______isSynced_______');
    console.log(isSynced);

    if (!isSynced) await triggerRescan();
    const pczt = await createPCZT(accountId, toAddress, valueinZats);

    if (pczt) {
      const pcztHexStringSigned = await signPczt(pczt);

      console.log('pcztHexStringSigned_____________');
      console.log(pcztHexStringSigned);

      const pcztBufferSigned = Buffer.from(pcztHexStringSigned, 'hex');

      console.log('pcztBufferSigned');
      console.log(pcztBufferSigned);

      const pcztUint8ArraySigned = new Uint8Array(pcztBufferSigned);

      console.log('pcztUint8ArraySigned');
      console.log(pcztUint8ArraySigned);

      const signedPczt = Pczt.from_bytes(pcztUint8ArraySigned);

      console.log('signedPczt_____________');
      console.log(signedPczt);

      const provedPczt = await provePczt(signedPczt);

      console.log('provedPcz_____________');
      console.log(provedPczt);

      const chainHeightBeforeSend = await state.webWallet!.get_latest_block();

      const isSyncedBeforeSend =
        chainHeightBeforeSend.toString() ===
        state.summary?.fully_scanned_height.toString();

      console.log('___________________isSyncedBeforeSend___________________');
      console.log(isSyncedBeforeSend);

      if (isSyncedBeforeSend) {
        await sendPczt(provedPczt);
      } else {


        await triggerRescan();


        const chainHeightBeforeSendSend = await state.webWallet!.get_latest_block();

        const isSyncedBeforeSendSend =
        chainHeightBeforeSendSend.toString() ===
          state.summary?.fully_scanned_height.toString();
  
        console.log('___________________isSyncedBeforeSendSend___________________');
        console.log(isSyncedBeforeSendSend);
        await sendPczt(provedPczt);
      }

      console.log('sent');
      await triggerRescan();
    }
  };

  return { handlePcztTransaction };
};
