import React, { FormEvent, useContext, useState } from "react";

import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";
import Spinner from "react-bootstrap/Spinner";

import { WalletContext } from "../App";
import { triggerTransfer } from "../Actions";
import { ZATOSHI_PER_ZEC } from "../Constants";

export function SendFunds() {
  let { state, dispatch } = useContext(WalletContext);

  let [toAddress, setToAddress] = useState("");
  let [amount, setAmount] = useState<number>(0.0);
  let [txBuilding, setTxBuilding] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    console.log("Sending", amount, "to", toAddress);
    const zatsAmount = BigInt(Math.floor(amount * ZATOSHI_PER_ZEC));
    setTxBuilding(true);
    triggerTransfer(state, dispatch, toAddress, zatsAmount)
    .then(() => {
      setTxBuilding(false);
      setToAddress("");
      setAmount(0.0);
      console.log("Send complete");
    })
    .catch((e) => {
      setTxBuilding(false);
      console.error("Send failed", e);
    });
  };

  return (
    <Form onSubmit={handleSubmit}>
      <Form.Group className="mb-3" controlId="formSend">
        <Form.Label>To:</Form.Label>
        <Form.Control
          type="text"
          placeholder="Zcash u-address"
          value={toAddress}
          onChange={(e) => setToAddress(e.target.value)}
          disabled={txBuilding}
        />
        <Form.Label>Amount:</Form.Label>
        <Form.Control
          type="number"
          placeholder="0.0"
          size="lg"
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value))}
          disabled={txBuilding}
        />
        <Form.Label>Memo (optional):</Form.Label>
        <Form.Control type="text" placeholder="memo text (max 512 bytes)" disabled={txBuilding}/>
      </Form.Group>
      <Button variant="primary" type="submit" disabled={txBuilding}>
        {!txBuilding ? (
          <span>Send</span>
        ) : (
          <div>
            <Spinner
              as="span"
              animation="border"
              size="sm"
              role="status"
              aria-hidden="true"
            />
            <span> Transaction Proving...</span>
          </div>
        )}
      </Button>
    </Form>
  );
}
