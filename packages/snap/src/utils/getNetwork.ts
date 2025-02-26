enum Network {
  MAIN = 'main',
  TEST = 'test',
}
enum Env {
  DEV = 'dev',
  PROD = 'prod',
}

export function getNetwork(): Network {
  const value = process.env.SNAP_ENV as Env;

  return value === Env.PROD ? Network.MAIN : Network.TEST;
}

export const NETWORK = getNetwork();
