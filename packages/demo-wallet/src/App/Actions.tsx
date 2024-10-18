import initWasm, { initThreadPool, WebWallet } from "@webzjs/webz-core";
import { get, set } from "idb-keyval";

import { State, Action } from "./App";
import { MAINNET_LIGHTWALLETD_PROXY } from "./Constants";

export async function init(state: State, dispatch: React.Dispatch<Action>) {
  await initWasm();
  await initThreadPool(10);

  let bytes = await get("wallet");
  let wallet;
  if (bytes) {
    console.info("Saved wallet detected. Restoring wallet from storage");
    wallet = new WebWallet("main", MAINNET_LIGHTWALLETD_PROXY, 1, bytes);
    console.info("also restoring any cached seeds");
    let seeds = await get("seeds");
    if (seeds) {
      dispatch({ type: "set-account-seeds", payload: seeds });
    }
  } else {
    console.info("No saved wallet detected. Creating new wallet");
    wallet = new WebWallet("main", MAINNET_LIGHTWALLETD_PROXY, 1);
  }

  dispatch({
    type: "set-web-wallet",
    payload: wallet,
  });
  let summary = await wallet.get_wallet_summary();
  if (summary) {
    dispatch({ type: "set-summary", payload: summary });
  }
  let chainHeight = await wallet.get_latest_block();
  if (chainHeight) {
    dispatch({ type: "set-chain-height", payload: chainHeight });
  }
  dispatch({
    type: "set-active-account",
    payload: summary?.account_balances[0][0],
  });
  dispatch({
    type: "set-loading",
    payload: false,
  });
}

export async function addNewAccount(
  state: State,
  dispatch: React.Dispatch<Action>,
  seedPhrase: string,
  birthdayHeight: number
) {
  let account_id =
    (await state.webWallet?.create_account(seedPhrase, 0, birthdayHeight)) || 0;
  dispatch({ type: "add-account-seed", payload: [account_id, seedPhrase] });
  dispatch({ type: "set-active-account", payload: account_id });
  await syncStateWithWallet(state, dispatch);
}

export async function syncStateWithWallet(
  state: State,
  dispatch: React.Dispatch<Action>
) {
  if (!state.webWallet) {
    console.error("Wallet not initialized");
    return;
  }
  let summary = await state.webWallet?.get_wallet_summary();
  if (summary) {
    dispatch({ type: "set-summary", payload: summary });
  }
  let chainHeight = await state.webWallet?.get_latest_block();
  if (chainHeight) {
    dispatch({ type: "set-chain-height", payload: chainHeight });
  }
}

export async function triggerRescan(
  state: State,
  dispatch: React.Dispatch<Action>
) {
  if (state.loading) { 
    console.error("App not yet loaded");
    return;
  }
  if (!state.webWallet) {
    console.error("Wallet not initialized");
    return;
  }
  if (state.activeAccount == undefined) {
    console.error("No active account");
    return;
  }
  if (state.syncInProgress) { 
    console.error("Sync already in progress");
    return;
  }
  dispatch({
    type: "set-sync-in-progress",
    payload: true,
  });

  await state.webWallet?.sync();
  await syncStateWithWallet(state, dispatch);
  await flushDbToStore(state, dispatch);

  dispatch({
    type: "set-sync-in-progress",
    payload: false,
  });
}

export async function triggerTransfer(
  state: State,
  dispatch: React.Dispatch<Action>,
  toAddress: string,
  amount: bigint
) {
  if (!state.webWallet) {
    console.error("Wallet not initialized");
    return;
  }
  if (state.activeAccount == null) {
    console.error("No active account");
    return;
  }

  let activeAccountSeedPhrase =
    state.accountSeeds.get(state.activeAccount) || "";

  let proposal = await state.webWallet?.propose_transfer(
    state.activeAccount,
    toAddress,
    amount
  );
  console.log(JSON.stringify(proposal.describe(), null, 2));

  let txids = await state.webWallet.create_proposed_transactions(
    proposal,
    activeAccountSeedPhrase,
    0
  );
  console.log("transaction created with id", JSON.stringify(txids, null, 2));

  await state.webWallet.send_authorized_transactions(txids);

  console.log("transaction sent to the network");
}

export async function flushDbToStore(
  state: State,
  dispatch: React.Dispatch<Action>
) {
  if (!state.webWallet) {
    console.error("Wallet not initialized");
    return;
  }
  console.info("Serializing wallet and dumpling to IndexDb store");
  let bytes = await state.webWallet.db_to_bytes();
  await set("wallet", bytes);
  console.info("Wallet saved to storage");
  console.info("Flushing stored seeds to store");
  await set("seeds", state.accountSeeds);
  console.info("Seeds saved to storage");
}

export async function clearStore(
  dispatch: React.Dispatch<Action>
) {
  console.info("Clearing wallet from IndexDb store");
  await set("wallet", undefined);
  console.info("Wallet cleared from storage");

  location.reload();
}
