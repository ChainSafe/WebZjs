import { getViewingKey } from './rpc/getViewingKey';
import { InitOutput, initSync } from '@webzjs/webz-keys';
// This import will be the wasm as a base64 encoded string because we are using the
// asset/inline bundler option in the snap.config.ts
import wasmDataBase64 from '@webzjs/webz-keys/webz_keys_bg.wasm';

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
  initializeWasm();

  switch (request.method) {
    case 'getViewingKey':
      return await getViewingKey();
    default:
      throw new Error('Method not found.');
  }
};

function initializeWasm() {
  // remove the data url prefix
  const base64 = (wasmDataBase64 as any as string).split(',')[1] || '';
  const wasmData = Buffer.from(base64, 'base64');
  initSync(wasmData);
}
