import "./App.css";

import React, { useState, useEffect, createContext } from "react";

import Tab from "react-bootstrap/Tab";
import Tabs from "react-bootstrap/Tabs";

import initWasm, { initThreadPool, start, WebWallet } from "@webzjs/webz-core";

import { ImportAccount } from "./components/ImportAccount";
import { SendFunds } from "./components/SendFunds";
import { ReceiveFunds } from "./components/ReceiveFunds";
import { Balance } from "./components/Balance";
import { Scan } from "./components/Scan";


const SAPLING_ACTIVATION = 419200;
const ORCHARD_ACTIVATION = 1687104;
const TIP = 2442739;

const MAINNET_LIGHTWALLETD_PROXY = "https://zcash-mainnet.chainsafe.dev";
const TESTNET_LIGHTWALLETD_PROXY = "https://zcash-testnet.chainsafe.dev";

export const WalletContext = createContext<WebWallet | null>(null);

export function App() {

  useEffect(() => {
    async function init() {
      await initWasm();
      await initThreadPool(1);
      setWebWallet(new WebWallet("main", MAINNET_LIGHTWALLETD_PROXY, 1));
    }
    init();
  }, []);

  let [webWallet, setWebWallet] = useState<WebWallet | null>(null);

  return (
    <div>
      <WalletContext.Provider value={webWallet}>
        <h1>WebZjs Wallet Demo</h1>

        <Tabs defaultActiveKey="import" id="base-wallet-tabs" className="mb-3">
          <Tab eventKey="import" title="Import Account">
            <ImportAccount />
          </Tab>
          <Tab eventKey="scan" title="Scan">
            <Scan />
          </Tab>
          <Tab eventKey="balance" title="Balance">
            <Balance />
          </Tab>
          <Tab eventKey="send" title="Send">
            <SendFunds />
          </Tab>
          <Tab eventKey="receive" title="Receive">
            <ReceiveFunds />
          </Tab>
        </Tabs>
      </WalletContext.Provider>
    </div>
  );
}
