import "./App.css";

import React, { useState, useEffect, createContext } from "react";

import Tab from "react-bootstrap/Tab";
import Tabs from "react-bootstrap/Tabs";
import Stack from "react-bootstrap/Stack";

import initWasm, {
  initThreadPool,
  start,
  WebWallet,
  WalletSummary,
} from "@webzjs/webz-core";

import { Header } from "./components/Header";
import { ImportAccount } from "./components/ImportAccount";
import { SendFunds } from "./components/SendFunds";
import { ReceiveFunds } from "./components/ReceiveFunds";
import { Summary } from "./components/Summary";

const MAINNET_LIGHTWALLETD_PROXY = "https://zcash-mainnet.chainsafe.dev";

export const WalletContext = createContext<WebWallet | null>(null);

export function App() {
  useEffect(() => {
    async function init() {
      await initWasm();
      await initThreadPool(10);
      setWebWallet(new WebWallet("main", MAINNET_LIGHTWALLETD_PROXY, 1));
    }
    init();
  }, []);

  let [webWallet, setWebWallet] = useState<WebWallet | null>(null);
  let [summary, setSummary] = useState<WalletSummary | null>(null);
  let [chainHeight, setChainHeight] = useState<bigint | null>(null);
  let [activeAccoumt, setActiveAccount] = useState<number>(0);

  const refreshSummary = async () => {
    if (!webWallet) {
      return;
    }
    let summary = await webWallet?.get_wallet_summary();
    if (summary) {
      setSummary(summary);
    }
    let chainHeight = await webWallet?.get_latest_block();
    if (chainHeight) {
      setChainHeight(chainHeight);
    }
  };

  const triggerRescan = () => {
    if (!webWallet) {
      return;
    }
    console.log("rescanning");
    webWallet.sync2().then(() => {
      console.log("rescan complete");
    });
  };

  return (
    <div>
      <WalletContext.Provider value={webWallet}>
        <Stack>
          <h1>WebZjs Wallet Demo</h1>
          <Header
            walletSummary={summary}
            refreshSummary={refreshSummary}
            activeAccount={activeAccoumt}
            setActiveAccount={setActiveAccount}
            triggerRescan={triggerRescan}
            chainHeight={chainHeight}
          />
          <Tabs
            defaultActiveKey="import"
            id="base-wallet-tabs"
            className="mb-3"
          >
            <Tab eventKey="import" title="Import Account">
              <ImportAccount refreshSummary={refreshSummary} />
            </Tab>
            <Tab eventKey="summary" title="Summary">
              <Summary walletSummary={summary} />
            </Tab>
            <Tab eventKey="send" title="Send">
              <SendFunds />
            </Tab>
            <Tab eventKey="receive" title="Receive">
              <ReceiveFunds />
            </Tab>
          </Tabs>
        </Stack>
      </WalletContext.Provider>
    </div>
  );
}
