import initWasm, * as WebZJSWallet from '@chainsafe/webzjs-wallet';
import { initThreadPool, WebWallet } from '@chainsafe/webzjs-wallet';
import initKeys, * as WebZJSKeys from '@chainsafe/webzjs-keys';
import initRequests, * as WebZJSRequests from '@chainsafe/webzjs-requests';

window.WebZJSWallet = WebZJSWallet;
window.WebZJSKeys = WebZJSKeys;
window.WebZJSRequests = WebZJSRequests;

const N_THREADS = 10;
const MAINNET_LIGHTWALLETD_PROXY = 'https://zcash-mainnet.chainsafe.dev';

async function loadPage() {
  await new Promise((resolve) => {
    window.addEventListener('load', resolve);
  });

  // Code to executed once the page has loaded
  await initWasm();
  await initKeys();
  await initRequests();
  await initThreadPool(N_THREADS);

  window.webWallet = new WebWallet('main', MAINNET_LIGHTWALLETD_PROXY, 1);
  window.initialized = true;
  console.log('WebWallet initialized');
  console.log(webWallet);
}

loadPage();
