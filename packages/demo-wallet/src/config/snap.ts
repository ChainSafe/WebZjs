import { env } from './env_selector';

export const defaultSnapOrigin =
  // eslint-disable-next-line no-restricted-globals
  env.SNAP_ORIGIN ?? `local:http://localhost:8080`;
