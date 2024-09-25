import React, { useContext, useEffect, useState } from "react";

import Form from "react-bootstrap/Form";

import { WalletContext } from "../App";
import { WalletSummary, AccountBalance } from "@webzjs/webz-core";
import { Button } from "react-bootstrap";

export function Summary({
  walletSummary,
}: {
  walletSummary: WalletSummary | null;
}) {
  return (
    <div>
      <pre>
        {JSON.stringify(
          walletSummary?.toJSON(),
          (key, value) =>
            typeof value === "bigint" ? value.toString() : value,
          2
        )}
      </pre>
    </div>
  );
}
