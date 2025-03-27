//NU5 (Network Upgrade 5) (Block 1,687,104, May 31, 2022)
const NU5_ACTIVATION = 1687104;

export function setSyncBlockHeight(
  userInputCreationBlock: string | null,
  latestBlock: number,
): number {
  if (userInputCreationBlock === null) return latestBlock;

  const customBirthdayBlock = Number(userInputCreationBlock);

  const latestAcceptableSyncBlock = NU5_ACTIVATION;

  return customBirthdayBlock > latestAcceptableSyncBlock
    ? customBirthdayBlock
    : latestAcceptableSyncBlock;
}
