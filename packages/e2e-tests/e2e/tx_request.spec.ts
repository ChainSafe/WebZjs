import { test, expect } from "@playwright/test";

import type * as WebZWallet from "@webzjs/webz-wallet";
import type * as WebZRequests from "@webzjs/webz-requests";

declare global {
  interface Window {
    initialized: boolean;
    WebZWallet: typeof WebZWallet;
    WebZRequests: typeof WebZRequests;
  }
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.waitForFunction(() => window.initialized === true);
});

test("decode from uri", async ({ page }) => {
  let result = await page.evaluate(async () => {
    const uri =
      "zcash:u1mcxxpa0wyyd3qpkl8rftsa6n7tkh9lv8u8j3zpd9f6qz37dqwur38w6tfl5rpv7m8g8mlca7nyn7qxr5qtjemjqehcttwpupz3fk76q8ft82yh4scnyxrxf2jgywgr5f9ttzh8ah8ljpmr8jzzypm2gdkcfxyh4ad93c889qv3l4pa748945c372ku7kdglu388zsjvrg9dskr0v9zj?amount=1&message=Thank%20you%20for%20your%20purchase";
    let request = window.WebZRequests.TransactionRequest.from_uri(uri);
    return {
      total: request.total(),
      to: request.payment_requests()[0].recipient_address(),
      message: request.payment_requests()[0].message(),
    };
  });
  expect(result.total).toBe(100000000n); // 1 ZEC
  expect(result.to).toBe(
    "u1mcxxpa0wyyd3qpkl8rftsa6n7tkh9lv8u8j3zpd9f6qz37dqwur38w6tfl5rpv7m8g8mlca7nyn7qxr5qtjemjqehcttwpupz3fk76q8ft82yh4scnyxrxf2jgywgr5f9ttzh8ah8ljpmr8jzzypm2gdkcfxyh4ad93c889qv3l4pa748945c372ku7kdglu388zsjvrg9dskr0v9zj"
  );
  expect(result.message).toBe("Thank you for your purchase");
});
