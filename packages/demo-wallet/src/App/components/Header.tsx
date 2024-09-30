import React, { useContext } from "react";

import Form from "react-bootstrap/Form";
import Card from "react-bootstrap/Card";
import Stack from "react-bootstrap/Stack";

import { WalletContext } from "../App";
import { syncStateWithWallet, triggerRescan } from "../Actions";
import { Button } from "react-bootstrap";

import { zatsToZec } from "../../utils";

export function Header() {
  const { state, dispatch } = useContext(WalletContext);

  let activeBalanceReport =
    state.summary?.account_balances.find(
      ([id]) => id === state.activeAccount
    );
    
    let totalBalance = activeBalanceReport ? activeBalanceReport[1].sapling_balance + activeBalanceReport[1].orchard_balance : 0
  return (
    <Stack direction="horizontal" gap={3}>
      <Form.Select
        value={state.activeAccount}
        onChange={(e) =>
          dispatch({
            type: "set-active-account",
            payload: parseInt(e.target.value),
          })
        }
      >
        {state.summary?.account_balances.map(([id]) => (
          <option key={id} value={id}>
            Account {id}
          </option>
        ))}
      </Form.Select>
      <Card style={{ width: "30rem" }}>
        <Card.Title>Balance: {zatsToZec(totalBalance)} ZEC</Card.Title>
        <Card.Text>Available Balance: {zatsToZec(0)} ZEC</Card.Text>
      </Card>
      <Card style={{ width: "30rem" }}>
        <Card.Text>
          Chain Height: {state.chainHeight ? "" + state.chainHeight : "?"}
        </Card.Text>
        <Card.Text>
          Synced Height:{" "}
          {state.summary?.fully_scanned_height
            ? state.summary?.fully_scanned_height
            : "?"}
        </Card.Text>
      </Card>
      <Stack>
        <Button
          onClick={async () =>
            await syncStateWithWallet(state, dispatch)
          }
        >
          Refresh
        </Button>
        <Button onClick={() => triggerRescan(state, dispatch)}>
          Sync
        </Button>
      </Stack>
    </Stack>
  );
}
