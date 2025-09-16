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
  const interfaceId = await snap.request({
    method: 'snap_createInterface',
    params: {
      ui: (
        <Form name="birthday-block-form">
          <Box>
            <Heading>Optional syncing block height</Heading>
            <Text>
              If you already created Zcash Web Wallet account with this MetaMask
              seed you can enter optional birthday block of that Wallet.
            </Text>
            <Divider />
            <Text>Syncing proccess will start from that block.</Text>
            <Divider />
            {!!latestBlock && (
              <Text>
                Latest block: <Bold>{latestBlock.toString()}</Bold>
              </Text>
            )}
            <Input
              min={0}
              step={1}
              type="number"
              name="customBirthdayBlock"
              placeholder="optional syncing block height"
            />
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

  await snap.request({
    method: 'snap_manageState',
    params: {
      operation: 'update',
      newState: { webWalletSyncStartBlock },
    },
  });

  return webWalletSyncStartBlock;
}
