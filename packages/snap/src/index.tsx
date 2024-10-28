import { getViewingKey } from './rpc/getViewingKey';
import { InitOutput, wasmExportsPromise } from '@chainsafe/webzjs-wasm';

let wasmModule: InitOutput;

/**
 * Handle incoming JSON-RPC requests, sent through `wallet_invokeSnap`.
 *
 *
 * invoked the snap.
 * @param args.request - A validated JSON-RPC request object.
 * @returns The ViewingKey
 * @throws If the request method is not valid for this snap.
 */
export const onRpcRequest: ({
  request,
}: {
  request: any;
}) => Promise<void> = async ({ request }) => {
  if (!wasmModule) {
    wasmModule = await wasmExportsPromise;
    console.log('wasmModule', wasmModule);
  }

  switch (request.method) {
    case 'getViewingKey':
      return await getViewingKey();
    default:
      throw new Error('Method not found.');
  }
};
