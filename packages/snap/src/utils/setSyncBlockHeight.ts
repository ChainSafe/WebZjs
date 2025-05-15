//NU5 (Network Upgrade 5) (Block 1,687,104, May 31, 2022)
const NU5_ACTIVATION = 1687104;

export function setSyncBlockHeight(
  userInputCreationBlock: string | null,
  latestBlock: number,
): number {
  //In case input was empty, default to latestBlock
  if (userInputCreationBlock === null) return latestBlock;

  // Check if input is a valid number
  if (!/^\d+$/.test(userInputCreationBlock)) return latestBlock;

  const customBirthdayBlock = Number(userInputCreationBlock);

  // Check if custom block is higher than latest block
  if (customBirthdayBlock > latestBlock) return latestBlock;

  const latestAcceptableSyncBlock = NU5_ACTIVATION;

  //In case user entered older than acceptable block height
  return customBirthdayBlock > latestAcceptableSyncBlock
    ? customBirthdayBlock
    : latestAcceptableSyncBlock;
}
