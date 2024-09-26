import React, { FormEvent, useContext, useState } from "react";

import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";

import { WalletContext } from "../App";
import { triggerTransfer } from "../Actions";

export function SendFunds() {
  let { state, dispatch } = useContext(WalletContext);

  let [toAddress, setToAddress] = useState("");
  let [amount, setAmount] = useState<bigint>(BigInt(0));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    console.log("Sending", amount, "to", toAddress);
    await triggerTransfer(state, dispatch, toAddress, amount);
    console.log("Send complete");
  };

  return (
    <Form onSubmit={handleSubmit}>
      <Form.Group className="mb-3" controlId="formSend">
        <Form.Label>To:</Form.Label>
        <Form.Control
          type="text"
          placeholder="Zcash z-address"
          value={toAddress}
          onChange={(e) => setToAddress(e.target.value)}
        />
        <Form.Label>Amount:</Form.Label>
        <Form.Control
          type="number"
          placeholder="0.0"
          size="lg"
          value={"" + amount}
          onChange={(e) => setAmount(BigInt(e.target.value))}
        />
        <Form.Label>Memo (optional):</Form.Label>
        <Form.Control type="text" placeholder="memo text (max 512 bytes)" />
      </Form.Group>
      <Button variant="primary" type="submit">
        Send
      </Button>
    </Form>
  );
}
