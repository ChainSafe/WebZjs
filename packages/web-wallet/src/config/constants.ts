// For local development (with docker proxy running: docker compose -f traefik/docker-compose.yml up -d)
export const MAINNET_LIGHTWALLETD_PROXY = 'http://localhost:1234/mainnet';

// For production (deployed to webzjs.chainsafe.dev):
// export const MAINNET_LIGHTWALLETD_PROXY = 'https://zcash-mainnet.chainsafe.dev';
export const ZATOSHI_PER_ZEC = 1e8;
export const RESCAN_INTERVAL = 35000;
export const NU5_ACTIVATION = 1687104;
