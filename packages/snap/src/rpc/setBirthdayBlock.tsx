/** @jsxImportSource @metamask/snaps-sdk */
import {
  Form,
  Box,
  Heading,
  Input,
  Button,
  Text,
  Bold,
  Divider,
} from '@metamask/snaps-sdk/jsx';
import { setSyncBlockHeight } from '../utils/setSyncBlockHeight';

type BirthdayBlockForm = { customBirthdayBlock: string | null };

type SetBirthdayBlockParams = { latestBlock: number };

export async function setBirthdayBlock({
  latestBlock,
}: SetBirthdayBlockParams): Promise<number | null> {
  // Calculate approximate block heights for different time ranges
  // Zcash produces ~576 blocks per day (1 block per 75 seconds)
  const blocksPerDay = 576;
  const oneMonthAgo = Math.max(latestBlock - blocksPerDay * 30, 1687104);
  const sixMonthsAgo = Math.max(latestBlock - blocksPerDay * 180, 1687104);
  const oneYearAgo = Math.max(latestBlock - blocksPerDay * 365, 1687104);
  const twoYearsAgo = Math.max(latestBlock - blocksPerDay * 730, 1687104);

  const interfaceId = await snap.request({
    method: 'snap_createInterface',
    params: {
      ui: (
        <Form name="birthday-block-form">
          <Box>
            <Heading>When was this wallet created?</Heading>
            <Text>
              If you have used this wallet before, enter the approximate block
              height when you first received funds. This helps us find your
              transactions faster.
            </Text>
            <Divider />
            <Text>
              <Bold>Quick reference:</Bold>
            </Text>
            <Text>
              - Last month: ~{oneMonthAgo.toLocaleString()}
            </Text>
            <Text>
              - 6 months ago: ~{sixMonthsAgo.toLocaleString()}
            </Text>
            <Text>
              - 1 year ago: ~{oneYearAgo.toLocaleString()}
            </Text>
            <Text>
              - 2+ years ago: ~{twoYearsAgo.toLocaleString()}
            </Text>
            <Text>
              - Unknown/Full scan: 1687104 (NU5 activation)
            </Text>
            <Divider />
            {!!latestBlock && (
              <Text>
                Current block: <Bold>{latestBlock.toLocaleString()}</Bold>
              </Text>
            )}
            <Input
              min={0}
              step={1}
              type="number"
              name="customBirthdayBlock"
              placeholder="Enter block height (leave empty for new wallet)"
            />
            <Text>
              Leave empty if this is a new wallet.
            </Text>
          </Box>
          <Button type="submit" name="next">
            Continue to wallet
          </Button>
        </Form>
      ),
    },
  });

  let customBirthdayBlock: string | null;
  try {
    const dialogResponse = (await snap.request({
      method: 'snap_dialog',
      params: {
        id: interfaceId,
      },
    })) as BirthdayBlockForm;
    customBirthdayBlock = dialogResponse.customBirthdayBlock;
  } catch (error) {
    console.log('No custom birthday block provided, using latest block');
    customBirthdayBlock = null;
  }

  const webWalletSyncStartBlock = setSyncBlockHeight(customBirthdayBlock, latestBlock);

  const existing = await snap.request({
    method: 'snap_manageState',
    params: { operation: 'get' },
  }) as Record<string, unknown> | null;

  await snap.request({
    method: 'snap_manageState',
    params: {
      operation: 'update',
      newState: { ...existing, webWalletSyncStartBlock },
    },
  });

  return webWalletSyncStartBlock;
}
