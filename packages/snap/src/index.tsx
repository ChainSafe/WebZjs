import { getViewingKey } from './rpc/getViewingKey';
import { InitOutput } from '@webzjs/webz-keys';
import { initialiseWasm } from './utils/initialiseWasm';
import { OnRpcRequestHandler, OnUserInputHandler, UserInputEventType } from '@metamask/snaps-sdk';
import { setBirthdayBlock, SetBirthdayBlockParams } from './rpc/setBirthdayBlock';

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
export const onRpcRequest: OnRpcRequestHandler = async ({ request }) => {
  if (!wasm) {
    wasm = initialiseWasm();
  }

  switch (request.method) {
    case 'getViewingKey':
      return await getViewingKey();
    case 'setBirthdayBlock':
      const params = request.params as SetBirthdayBlockParams;
      return await setBirthdayBlock(params);
    default:
      throw new Error('Method not found.');
  }
};

export const onUserInput: OnUserInputHandler = async ({ id, event, context }) => {
  if (event.type === UserInputEventType.FormSubmitEvent) {
    switch (event.name) {
      case "birthday-block-form":
        await snap.request({
          method: "snap_resolveInterface",
          params: {
            id,
            value: event.value
          }
        })

      default:
        break;
    }
  }
};
