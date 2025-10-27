import { test, expect } from '@playwright/test';
import { WebWallet } from '@chainsafe/webzjs-wallet';

import type * as WebZJSKeys from '@chainsafe/webzjs-keys';
declare global {
  interface Window {
    webWallet: WebWallet;
    WebZJSKeys: typeof WebZJSKeys;
  }
}

const SEED =
  'mix sample clay sweet planet lava giraffe hand fashion switch away pool rookie earth purity truly square trumpet goose move actor save jaguar volume';
const BIRTHDAY = 2657762;

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => window.webWallet !== undefined);
  await page.evaluate(
    async ({ seed, birthday }) => {
      await window.webWallet.create_account('account-0', seed, 0, birthday);
    },
    { seed: SEED, birthday: BIRTHDAY },
  );
});

test('Account was added', async ({ page }) => {
  let result = await page.evaluate(async () => {
    let summary = await window.webWallet.get_wallet_summary();
    return summary?.account_balances.length;
  });
  expect(result).toBe(1);
});

test('Wallet can be serialized', async ({ page }) => {
  let result = await page.evaluate(async () => {
    let bytes = await window.webWallet.db_to_bytes();
    return bytes;
  });
});

