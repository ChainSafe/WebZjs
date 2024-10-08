import "./App.css";

import React, { useState, useEffect, createContext, useReducer } from "react";

import Tab from "react-bootstrap/Tab";
import Tabs from "react-bootstrap/Tabs";
import Stack from "react-bootstrap/Stack";

import {
  WebWallet,
  WalletSummary,
} from "@webzjs/webz-core";

import { init } from "./Actions";
import { Header } from "./components/Header";
import { ImportAccount } from "./components/ImportAccount";
import { SendFunds } from "./components/SendFunds";
import { ReceiveFunds } from "./components/ReceiveFunds";
import { Summary } from "./components/Summary";

export type State = {
  webWallet?: WebWallet;
  activeAccount?: number;
  summary?: WalletSummary;
  chainHeight?: bigint;
  accountSeeds: Map<number, string>;
};

const initialState: State = {
  activeAccount: undefined,
  summary: undefined,
  chainHeight: undefined,
  accountSeeds: new Map<number, string>(),
};

export type Action =
  | { type: "set-active-account"; payload: number }
  | { type: "add-account-seed"; payload: [number, string] }
  | { type: "set-web-wallet"; payload: WebWallet }
  | { type: "set-summary"; payload: WalletSummary }
  | { type: "set-chain-height"; payload: bigint };

const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case "set-active-account": {
      return { ...state, activeAccount: action.payload };
    }
    case "add-account-seed": {
      return { ...state, accountSeeds: state.accountSeeds.set(action.payload[0], action.payload[1]) };
    }
    case "set-web-wallet": {
      return { ...state, webWallet: action.payload };
    }
    case "set-summary": {
      return { ...state, summary: action.payload };
    }
    case "set-chain-height": {
      return { ...state, chainHeight: action.payload };
    }
    default:
      return state;
  }
};

export const WalletContext = createContext<{
  state: State;
  dispatch: React.Dispatch<Action>;
}>({ state: initialState, dispatch: () => {} });

export function App() {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    init(dispatch);
  }, [dispatch]);

  return (
    <div>
      <WalletContext.Provider value={{ state, dispatch }}>
        <Stack>
          <h1>WebZjs Wallet Demo</h1>
          <Header />
          <Tabs
            defaultActiveKey="import"
            id="base-wallet-tabs"
            className="mb-3"
          >
            <Tab eventKey="import" title="Import Account">
              <ImportAccount />
            </Tab>
            <Tab eventKey="summary" title="Summary">
              <Summary summary={state.summary}/>
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
