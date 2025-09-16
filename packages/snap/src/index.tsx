import { getViewingKey } from './rpc/getViewingKey';
import { InitOutput } from '@chainsafe/webzjs-keys';
import { initialiseWasm } from './utils/initialiseWasm';
import {
  OnRpcRequestHandler,
  OnUserInputHandler,
  UserInputEventType,
} from '@metamask/snaps-sdk';
import { setBirthdayBlock } from './rpc/setBirthdayBlock';
import { getSnapState } from './rpc/getSnapState';
import { SetBirthdayBlockParams, SignPcztParams, SnapState } from './types';
import { setSnapState } from './rpc/setSnapState';
import { signPczt } from './rpc/signPczt'

import { assert, object, number, optional, string } from 'superstruct';
import { getSeedFingerprint } from './rpc/getSeedFingerprint';
import type { OnInstallHandler } from "@metamask/snaps-sdk";
import { installDialog } from './utils/dialogs';

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
export const onRpcRequest: OnRpcRequestHandler = async ({ request, origin }) => {
  if (!wasm) {
    wasm = initialiseWasm();
  }

  switch (request.method) {
    case 'getViewingKey':
      return await getViewingKey(origin);
    case 'signPczt':
      assert(request.params, object({
        pcztHexTring: string(),
        signDetails: object({
          recipient: string(),
          amount: string()
        }),
      }));
      return await signPczt(request.params as SignPcztParams, origin);
    case 'getSeedFingerprint':
      return await getSeedFingerprint();
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

export const onInstall: OnInstallHandler = async (args) => {
  if (args.origin === 'https://webzjs.chainsafe.dev') return;

  await installDialog();
};
