export const LIGHTWALLET_PROXY =
  process.env.LIGHTWALLET_PROXY ?? 'https://zcash-mainnet.chainsafe.dev';
export const WALLET_NETWORK = process.env.WALLET_ENV ?? 'main';
export const ZATOSHI_PER_ZEC = 1e8;
export const RESCAN_INTERVAL = 20000;
export const NU5_ACTIVATION = 1687104;

console.log('process.env', process.env.NODE_ENV);
console.log(
  'process.env.LIGHTWALLET_PROXY',
  process.env.PARCEL_PUBLIC_LIGHTWALLET_PROXY,
);
console.log('process.env.WALLET_NETWORK', process.env.PARCEL_PUBLIC_WALLET_ENV);
