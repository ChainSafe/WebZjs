import initWasm, { initThreadPool, WebWallet } from "@webzjs/webz-core";

import { State, Action } from "./App";
import { MAINNET_LIGHTWALLETD_PROXY } from "./constants";

export async function init(dispatch: React.Dispatch<Action>) {
  await initWasm();
  await initThreadPool(10);
  dispatch({
    type: "set-web-wallet",
    payload: new WebWallet("main", MAINNET_LIGHTWALLETD_PROXY, 1),
  });
}

export async function addNewAccount(state: State, dispatch: React.Dispatch<Action>, seedPhrase: string, birthdayHeight: number) {
    await state.webWallet?.create_account(seedPhrase, 0, birthdayHeight);
    dispatch({ type: "append-account-seed", payload: seedPhrase });
    await syncStateWithWallet(state, dispatch);
}

export async function syncStateWithWallet(
  state: State,
  dispatch: React.Dispatch<Action>
) {
  if (!state.webWallet) {
    throw new Error("Wallet not initialized");
  }
  let summary = await state.webWallet?.get_wallet_summary();
  if (summary) {
    dispatch({ type: "set-summary", payload: summary });
  }
  let chainHeight = await state.webWallet?.get_latest_block();
  if (chainHeight) {
    dispatch({ type: "set-chain-height", payload: chainHeight });
  }
  dispatch({ type: "set-active-account", payload: summary?.account_balances[0][0] });
}

export async function triggerRescan(
  state: State,
  dispatch: React.Dispatch<Action>
) {
    if (!state.webWallet) {
        throw new Error("Wallet not initialized");
    }
    await state.webWallet?.sync2();
    await syncStateWithWallet(state, dispatch);
}

export async function triggerTransfer(
  state: State,
  dispatch: React.Dispatch<Action>,
  toAddress: string,
  amount: bigint
) {
    if (!state.webWallet) {
        throw new Error("Wallet not initialized");
    }
    if (state.activeAccount == null) {
        throw new Error("No active account");
    }

    await state.webWallet?.transfer(state.accountSeeds[state.activeAccount], state.activeAccount, toAddress, amount);
    await syncStateWithWallet(state, dispatch);
}
