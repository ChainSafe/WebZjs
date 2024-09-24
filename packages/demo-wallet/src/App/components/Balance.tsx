import React, { useContext, useEffect, useState } from "react";

import Form from "react-bootstrap/Form";

import { WalletContext } from "../App";
import { WalletSummary, AccountBalance } from "@webzjs/webz-core";
import { Button } from "react-bootstrap";

export function Balance() {
  let webWallet = useContext(WalletContext);
  let [summary, setSummary] = useState<WalletSummary | null>();

  let resyncSummary = async () => {
    if (!webWallet) {
      return;
    }
    console.log("fetching balance");
    let summary = await webWallet?.get_wallet_summary();
    console.log("summary", summary);
    console.log("balances");

    setSummary(summary);
  };

  return (
    <Form>
      <Button variant="primary" onClick={async () => await resyncSummary()}>
        Refresh
      </Button>
      {summary &&
        Array.from<[number, AccountBalance]>(summary?.account_balances).map(
          ([id, balance]) => (
            <div>
              <Form.Text>Account {id}</Form.Text>
              <Form.Group className="mb-3" controlId="formReceive" key={id}>
                <Form.Label>Orchard Balance:</Form.Label>
                <Form.Control
                  type="text"
                  disabled
                  value={"" + balance.orchard_balance}
                />
                <Form.Label>Sapling Balance:</Form.Label>
                <Form.Control
                  type="text"
                  disabled
                  value={"" + balance.sapling_balance}
                />
                <Form.Label>Unshielded Balance:</Form.Label>
                <Form.Control
                  type="text"
                  disabled
                  value={"" + balance.unshielded_balance}
                />
              </Form.Group>
            </div>
          )
        )}
    </Form>
  );
}
