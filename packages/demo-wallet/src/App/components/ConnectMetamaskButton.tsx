import React, { ComponentProps } from 'react';
import { Snap } from '../../types';
import { useRequestSnap } from '../../hooks';
import { useMetaMask } from '../../hooks';
import { Button } from 'react-bootstrap';

export const isLocalSnap = (snapId: string) => snapId.startsWith('local:');

export const shouldDisplayReconnectButton = (installedSnap: Snap | null) =>
  installedSnap && isLocalSnap(installedSnap?.id);

export function ConnectMetamaskButton() {
  const { installedSnap, isFlask } = useMetaMask();
  const requestSnap = useRequestSnap();

  if (!isFlask && !installedSnap) {
    return <InstallFlaskButton />;
  }

  if (!installedSnap) {
    return <ConnectButton onClick={requestSnap} />;
  }

  if (shouldDisplayReconnectButton(installedSnap)) {
    return <ReconnectButton onClick={requestSnap} />;
  }

  return <button>Connected</button>;
}

export const InstallFlaskButton = () => (
  <a href="https://metamask.io/flask/" target="_blank">
    <button>Install MetaMask Flask</button>
  </a>
);

const ConnectButton = (props: ComponentProps<typeof Button>) => {
  return (
    <button {...props}>
      <div>Connect</div>
    </button>
  );
};

const ReconnectButton = (props: ComponentProps<typeof Button>) => {
  return (
    <Button variant={'primary'} {...props}>
      <div>Reconnect</div>
    </Button>
  );
};
