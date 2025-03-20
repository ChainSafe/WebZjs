import { getViewingKey } from './rpc/getViewingKey';
import { InitOutput } from '@webzjs/webz-keys';
import { initialiseWasm } from './utils/initialiseWasm';
import {
  Json,
  OnRpcRequestHandler,
  OnUserInputHandler,
  UserInputEventType,
} from '@metamask/snaps-sdk';
import { setBirthdayBlock } from './rpc/setBirthdayBlock';
import { getSnapState } from './rpc/getSnapState';
import { SetBirthdayBlockParams, SignPcztParams, SnapState } from './types';
import { setSnapState } from './rpc/setSnapState';
import { signPczt } from './rpc/signPczt'

import { assert, object, number, optional, instance, string } from 'superstruct';

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
    case 'signPczt':
      assert(request.params, object({ pcztJsonStringified: string() }));
      // console.log('verified', request.params);
      return await signPczt(request.params as SignPcztParams);
    case 'setBirthdayBlock':
      assert(request.params, object({ latestBlock: optional(number()) }));
      return await setBirthdayBlock(request.params as SetBirthdayBlockParams);
    case 'getSnapStete':
      return await getSnapState();
    case 'setSnapStete':
      const setSnapStateParams = request.params as unknown as SnapState;
      return await setSnapState(setSnapStateParams);
    default:
      throw new Error('Method not found.');
  }
};

export const onUserInput: OnUserInputHandler = async ({ id, event }) => {
  if (event.type === UserInputEventType.FormSubmitEvent) {
    switch (event.name) {
      case 'birthday-block-form':
        await snap.request({
          method: 'snap_resolveInterface',
          params: {
            id,
            value: event.value,
          },
        });

      default:
        break;
    }
  }
};
