import "bootstrap/dist/css/bootstrap.min.css";

import { useState, useEffect } from "react";
import "./App.css";
import { ImportAccount } from "./components/ImportAccount";
import { SendFunds } from "./components/SendFunds";
import { ReceiveFunds } from "./components/ReceiveFunds";
import { Balance } from "./components/Balance";


import Tab from "react-bootstrap/Tab";
import Tabs from "react-bootstrap/Tabs";

const SAPLING_ACTIVATION = 419200;
const ORCHARD_ACTIVATION = 1687104;
const TIP = 2442739;

const MAINNET_LIGHTWALLETD_PROXY = "https://zcash-mainnet.chainsafe.dev";
const TESTNET_LIGHTWALLETD_PROXY = "https://zcash-testnet.chainsafe.dev";

export function App() {
  // Setup
  useEffect(() => {
    async function init() {
      // await initWasm();
    }
    init();
  }, []);

  return (
    <div>
      <h1>WebZjs Wallet Demo</h1>

      <Tabs
        defaultActiveKey="import"
        id="base-wallet-tabs"
        className="mb-3"
      >
        <Tab eventKey="import" title="Import Account">
          <ImportAccount/>
        </Tab>
        <Tab eventKey="balance" title="Balance">
          <Balance/>
        </Tab>
        <Tab eventKey="send" title="Send">
          <SendFunds/>
        </Tab>
        <Tab eventKey="receive" title="Receive">
          <ReceiveFunds/>
        </Tab>
      </Tabs>
    </div>
  );
}
