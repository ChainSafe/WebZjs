// Override via LIGHTWALLETD_PROXY env var for local dev (e.g. in .env.local)
// Default is the production proxy
export const MAINNET_LIGHTWALLETD_PROXY = process.env.LIGHTWALLETD_PROXY || 'https://zcash-mainnet.chainsafe.dev';
export const ZATOSHI_PER_ZEC = 1e8;
export const RESCAN_INTERVAL = 35000;          // 35s sync interval
export const NU5_ACTIVATION = 1687104;
