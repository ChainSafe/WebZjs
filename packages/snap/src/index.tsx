import { getViewingKey } from './rpc/getViewingKey';
import { initialiseWasm } from './utils/initialiseWasm';
import { signPczt } from './rpc/signPczt';
import { InitOutput } from '@webzjs/webz-keys';

let wasm: InitOutput;

/**
 * Handle incoming JSON-RPC requests, sent through `wallet_invokeSnap`.
 *
 *
 * invoked the snap.
 * @param args.request - A validated JSON-RPC request object.
 * @returns The ViewingKey
 * @throws If the request method is not valid for this snap.
 */
export const onRpcRequest: ({ request }) => Promise<string> = async ({
  request,
}) => {
  if (!wasm) {
    wasm = initialiseWasm();
  }

  switch (request.method) {
    case 'getViewingKey':
      return await getViewingKey();
    case 'signPczt':
      return await signPczt(request.params.pczt);
    default:
      throw new Error('Method not found.');
  }
};
