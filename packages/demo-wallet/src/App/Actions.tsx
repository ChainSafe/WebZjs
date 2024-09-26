import initWasm, { initThreadPool, WebWallet } from "@webzjs/webz-core";

import { Action } from "./App";
import { MAINNET_LIGHTWALLETD_PROXY } from "./constants";

export async function init(dispatch: React.Dispatch<Action>) {
  await initWasm();
  await initThreadPool(10);
  dispatch({
    type: "set-web-wallet",
    payload: new WebWallet("main", MAINNET_LIGHTWALLETD_PROXY, 1),
  });
}

export async function syncStateWithWallet(
  webWallet: WebWallet | undefined,
  dispatch: React.Dispatch<Action>
) {
  if (!webWallet) {
    return;
  }
  let summary = await webWallet?.get_wallet_summary();
  if (summary) {
    dispatch({ type: "set-summary", payload: summary });
  }
  let chainHeight = await webWallet?.get_latest_block();
  if (chainHeight) {
    dispatch({ type: "set-chain-height", payload: chainHeight });
  }
}

export async function triggerRescan(
  webWallet: WebWallet | undefined,
  dispatch: React.Dispatch<Action>
) {
    if (!webWallet) {
        return;
    }
    await webWallet?.sync2();
    await syncStateWithWallet(webWallet, dispatch);
}
