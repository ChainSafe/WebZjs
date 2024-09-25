import React, { useContext, useEffect, useState } from "react";

import Form from "react-bootstrap/Form";
import Card from "react-bootstrap/Card";
import Stack from "react-bootstrap/Stack";

import { WalletContext } from "../App";
import { WalletSummary } from "@webzjs/webz-core";
import { Button } from "react-bootstrap";

export function Header({
  walletSummary,
  refreshSummary,
  activeAccount,
  setActiveAccount,
  triggerRescan,
  chainHeight,
}: {
  walletSummary: WalletSummary | null;
  refreshSummary: () => Promise<void>;
  activeAccount: number;
  setActiveAccount: (account: number) => void;
  triggerRescan: () => void;
  chainHeight: bigint | null;
}) {
  return (
    <Stack direction="horizontal" gap={3}>
      <Form.Select
        value={activeAccount}
        onChange={(e) => setActiveAccount(parseInt(e.target.value))}
      >
        {walletSummary?.account_balances.map(([id]) => (
          <option key={id} value={id}>
            Account {id}
          </option>
        ))}
      </Form.Select>
      <Card style={{ width: "30rem" }}>
        <Card.Title>Balance: {0} ZEC</Card.Title>
        <Card.Text>Available Balance: {0} ZEC</Card.Text>
      </Card>
      <Card style={{ width: "30rem" }}>
        <Card.Text>Chain Height: {chainHeight ? ""+chainHeight : '?'}</Card.Text>
        <Card.Text>Synced Height: {walletSummary?.fully_scanned_height ? walletSummary?.fully_scanned_height : '?'}</Card.Text>
      </Card>
      <Stack>
        <Button onClick={async () => await refreshSummary()}>Refresh</Button>
        <Button onClick={() => triggerRescan()}>Sync</Button>
      </Stack>
    </Stack>
  );
}
