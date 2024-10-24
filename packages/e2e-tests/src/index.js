import initWasm, { initThreadPool, WebWallet } from "@webzjs/webz-wallet";

import initWasm, * as WebZWallet from "@webzjs/webz-wallet";
import initKeys, * as WebZKeys from "@webzjs/webz-keys";
import initRequests, * as WebZRequests from "@webzjs/webz-requests";

window.WebZWallet = WebZWallet;
window.WebZKeys = WebZKeys;
window.WebZRequests = WebZRequests;

const N_THREADS = 10;
const MAINNET_LIGHTWALLETD_PROXY = "https://zcash-mainnet.chainsafe.dev";

async function loadPage() {
  await new Promise((resolve) => {
    window.addEventListener("load", resolve);
  });

  // Code to executed once the page has loaded
  await initWasm();
  await initKeys();
  await initRequests();
  await initThreadPool(N_THREADS);

  window.webWallet = new WebWallet(
    "main",
    MAINNET_LIGHTWALLETD_PROXY,
    1
  );
  window.initialized = true;
  console.log("WebWallet initialized");
  console.log(webWallet);
}

loadPage();