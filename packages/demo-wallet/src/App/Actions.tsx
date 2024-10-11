import initWasm, { initThreadPool, WebWallet } from "@webzjs/webz-core";

import { State, Action } from "./App";
import { MAINNET_LIGHTWALLETD_PROXY } from "./Constants";

export async function init(dispatch: React.Dispatch<Action>) {
  await initWasm();
  await initThreadPool(10);
  dispatch({
    type: "set-web-wallet",
    payload: new WebWallet("main", MAINNET_LIGHTWALLETD_PROXY, 1),
  });
}

export async function addNewAccount(state: State, dispatch: React.Dispatch<Action>, seedPhrase: string, birthdayHeight: number) {
    let account_id = await state.webWallet?.create_account(seedPhrase, 0, birthdayHeight) || 0;
    dispatch({ type: "add-account-seed", payload: [account_id, seedPhrase] });
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
    await state.webWallet?.sync();
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

    let activeAccountSeedPhrase = state.accountSeeds.get(state.activeAccount) || "";
    
    let proposal = await state.webWallet?.propose_transfer(state.activeAccount, toAddress, amount);
    console.log(JSON.stringify(proposal.describe(), null, 2));
    
    let txids = await state.webWallet.create_proposed_transactions(proposal, activeAccountSeedPhrase, 0);
    console.log(JSON.stringify(txids, null, 2));
    
    await state.webWallet.send_authorized_transactions(txids);
}
