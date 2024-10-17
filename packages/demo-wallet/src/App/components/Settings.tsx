import React, { useContext } from "react";

import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";

import { WalletContext } from "../App";
import { clearStore } from "../Actions";

export function Settings() {
  let { dispatch } = useContext(WalletContext);

  return (
    <div>
      <Form>
        <Button variant="danger" onClick={() => clearStore(dispatch)}>
          Reset Wallet
        </Button>
        <Form.Text className="text-muted">
          This will delete all accounts from the persistent store and reset the wallet to its initial state.
      </Form.Text>
      </Form>
    </div>
  );
}
