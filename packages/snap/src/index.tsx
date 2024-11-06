import { getViewingKey } from './rpc/getViewingKey';
import { InitOutput } from '@webzjs/webz-keys';
import { initialiseWasm } from './utils/initialiseWasm';

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
export const onRpcRequest: ({
  request,
}: {
  request: any;
}) => Promise<string> = async ({ request }) => {
  if (!wasm) {
    wasm = initialiseWasm();
  }

  switch (request.method) {
    case 'getViewingKey':
      return await getViewingKey();
    default:
      throw new Error('Method not found.');
  }
};
