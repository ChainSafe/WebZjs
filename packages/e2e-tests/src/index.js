import initWasm, { initThreadPool, WebWallet } from "@webzjs/webz-core";

const N_THREADS = 10;
const MAINNET_LIGHTWALLETD_PROXY = "https://zcash-mainnet.chainsafe.dev";

async function loadPage() {
  await new Promise((resolve) => {
    window.addEventListener("load", resolve);
  });

  // Code to executed once the page has loaded
  await initWasm();
  await initThreadPool(N_THREADS);
  window.webWallet = new WebWallet(
    "main",
    MAINNET_LIGHTWALLETD_PROXY,
    1
  );
  console.log("WebWallet initialized");
  console.log(webWallet);
}

loadPage();