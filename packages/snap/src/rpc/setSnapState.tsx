import { Json } from '@metamask/snaps-sdk';
import { SnapState } from 'src/types';

export async function setSnapState(newSnapState: SnapState): Promise<Json> {
  const state = (await snap.request({
    method: 'snap_manageState',
    params: {
      operation: 'update',
      newState: newSnapState,
    },
  })) as unknown as Json;

  return state;
}
