import React from "react";
import { WalletSummary } from "@chainsafe/webzj-wallet";

export function Summary({
  summary,
}: {
  summary: WalletSummary | undefined;
}) {
  return (
    <div>
      <pre>
        {JSON.stringify(
          summary?.toJSON(),
          (key, value) =>
            typeof value === "bigint" ? value.toString() : value,
          2
        )}
      </pre>
    </div>
  );
}
