import { test, expect } from '@playwright/test';
import { WebWallet } from '@webzjs/webz-wallet';

import type * as WebZKeys from '@webzjs/webz-keys';
declare global {
  interface Window {
    webWallet: WebWallet;
    WebZKeys: typeof WebZKeys;
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

test('Accont can be added from ufvk', async ({ page }) => {
  let result = await page.evaluate(async () => {
    let seed = new Uint8Array(32);
    let birthday = 2657762;
    let usk = new window.WebZKeys.UnifiedSpendingKey('main', seed, 0);
    let ufvk = usk.to_unified_full_viewing_key();
    await window.webWallet.create_account_ufvk(
      'account-0',
      ufvk.encode('main'),
      birthday,
    );
    let summary = await window.webWallet.get_wallet_summary();
    return summary?.account_balances.length;
  });
  expect(result).toBe(2);
});
