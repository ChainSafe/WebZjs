import React, { useContext, useEffect, useState } from "react";

import Form from "react-bootstrap/Form";

import { WalletContext } from "../App";
import { WalletSummary, AccountBalance } from "@webzjs/webz-core";
import { Button } from "react-bootstrap";

export function Header() {
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
    <div className="p-2">
        <span className="me-2">Balance: </span>
    </div>
  );
}
