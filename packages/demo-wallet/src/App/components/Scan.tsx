import React, { useContext, useEffect, useState } from "react";

import { WalletContext } from "../App";

import Form from "react-bootstrap/Form";
import Button from "react-bootstrap/Button";

export function Scan() {
  let webWallet = useContext(WalletContext);

  const startScan = async () => {
    if (!webWallet) {
      return;
    }
    console.log("Scanning begin...");
    await webWallet?.sync2();
    console.log("Scanning complete...");
  };

  return (
    <Form>
      <Button variant="primary" onClick={async () => await startScan()}>
        Scan
      </Button>
      <Form.Control as="textarea" rows={10} disabled />
    </Form>
  );
}
