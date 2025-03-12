import { Json } from '@metamask/snaps-sdk';

export async function getSnapState(): Promise<Json> {
  const state = (await snap.request({
    method: 'snap_manageState',
    params: {
      operation: 'get',
    },
  })) as unknown as Json;

  return state;
}
