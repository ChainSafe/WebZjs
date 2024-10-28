import './App.css';

import React, { useEffect, createContext, useReducer } from 'react';
import { useInterval } from 'usehooks-ts';

import Tab from 'react-bootstrap/Tab';
import Tabs from 'react-bootstrap/Tabs';
import Stack from 'react-bootstrap/Stack';
import Container from 'react-bootstrap/Container';
import LoadingOverlay from 'react-loading-overlay';

import { WebWallet, WalletSummary } from '@webzjs/webz-wallet';

import { init, triggerRescan } from './Actions';
import { Header } from './components/Header';
import { AddAccount } from './components/AddAccount';
import { SendFunds } from './components/SendFunds';
import { ReceiveFunds } from './components/ReceiveFunds';
import { Summary } from './components/Summary';
import { Settings } from './components/Settings';
import { RESCAN_INTERVAL } from './Constants';
import { ConnectMetamaskButton } from './components/ConnectMetamaskButton';
import { MetaMaskProvider } from '../hooks';

export type State = {
  webWallet?: WebWallet;
  activeAccount?: number;
  summary?: WalletSummary;
  chainHeight?: bigint;
  accountSeeds: Map<number, string>;
  syncInProgress: boolean;
  loading: boolean;
};

const initialState: State = {
  activeAccount: undefined,
  summary: undefined,
  chainHeight: undefined,
  accountSeeds: new Map<number, string>(),
  syncInProgress: false,
  loading: true,
};

export type Action =
  | { type: 'set-active-account'; payload: number }
  | { type: 'add-account-seed'; payload: [number, string] }
  | { type: 'set-web-wallet'; payload: WebWallet }
  | { type: 'set-summary'; payload: WalletSummary }
  | { type: 'set-chain-height'; payload: bigint }
  | { type: 'set-account-seeds'; payload: Map<number, string> }
  | { type: 'set-sync-in-progress'; payload: boolean }
  | { type: 'set-loading'; payload: boolean };

const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case 'set-active-account': {
      return { ...state, activeAccount: action.payload };
    }
    case 'add-account-seed': {
      return {
        ...state,
        accountSeeds: state.accountSeeds.set(
          action.payload[0],
          action.payload[1],
        ),
      };
    }
    case 'set-web-wallet': {
      return { ...state, webWallet: action.payload };
    }
    case 'set-summary': {
      return { ...state, summary: action.payload };
    }
    case 'set-chain-height': {
      return { ...state, chainHeight: action.payload };
    }
    case 'set-account-seeds': {
      return { ...state, accountSeeds: action.payload };
    }
    case 'set-sync-in-progress': {
      return { ...state, syncInProgress: action.payload };
    }
    case 'set-loading': {
      return { ...state, loading: action.payload };
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
    init(state, dispatch);
  }, [dispatch]);

  // rescan the wallet periodically
  useInterval(() => {
    triggerRescan(state, dispatch);
  }, RESCAN_INTERVAL);

  return (
    <div>
      <MetaMaskProvider>
        <WalletContext.Provider value={{ state, dispatch }}>
          <LoadingOverlay
            active={state.loading}
            spinner
            text="Loading. This may take up to 1 minute..."
          >
            <Container>
              <Stack>
                <h1>WebZjs Wallet Demo</h1>
                <ConnectMetamaskButton />
                <Header />
                <Tabs
                  defaultActiveKey="import"
                  id="base-wallet-tabs"
                  className="mb-3"
                >
                  <Tab eventKey="import" title="Import Account">
                    <AddAccount />
                  </Tab>
                  <Tab eventKey="summary" title="Summary">
                    <Summary summary={state.summary} />
                  </Tab>
                  <Tab eventKey="send" title="Send">
                    <SendFunds />
                  </Tab>
                  <Tab eventKey="receive" title="Receive">
                    <ReceiveFunds />
                  </Tab>
                  <Tab eventKey="settings" title="Settings">
                    <Settings />
                  </Tab>
                </Tabs>
              </Stack>
            </Container>
          </LoadingOverlay>
        </WalletContext.Provider>
      </MetaMaskProvider>
    </div>
  );
}
