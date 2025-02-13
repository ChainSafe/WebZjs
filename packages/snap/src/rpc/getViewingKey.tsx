import { UnifiedSpendingKey } from '@webzjs/webz-keys';
import { getSeed } from '../utils/getSeed';
import { Box, Button, Form, Heading, Input, Text } from '@metamask/snaps-sdk/jsx';

type Network = 'main' | 'test';

type BirthdayBlockForm = {customBirthdayBlock: number | null}

export async function getViewingKey(
  network: Network = 'main',
  accountIndex: number = 0,
) {
  try {
    // Retrieve the BIP-44 entropy from MetaMask

    const seed = await getSeed();

    const interfaceId = await snap.request({
      method: 'snap_createInterface',
      params: {
        ui:
          <Form name="birthday-block-form">
            <Box>
              <Heading>Optional syncing block height</Heading>
              <Text>
                If you alerady created Zcash Web Wallet account with this Metamask seed you can enter optional birthday block of that Wallet.
                Syncing proccess will start from that block.
              </Text>
              <Input min={0} step={1} type='number' name="customBirthdayBlock" placeholder='optional syncing block height' />
            </Box>
            <Button type='submit' name="next">Next</Button>
          </Form>
        ,
      },
    });

    const {customBirthdayBlock} = await snap.request({
      method: "snap_dialog",
      params: {
        id: interfaceId,
      },
    }) as BirthdayBlockForm;

    // Generate the UnifiedSpendingKey and obtain the Viewing Key
    const spendingKey = new UnifiedSpendingKey(network, seed, accountIndex);
    const viewingKey = spendingKey.to_unified_full_viewing_key().encode(network);

    return {
      viewingKey,
      customBirthdayBlock
    }
  } catch (error) {
    console.error('Error generating Viewing Key:', error);
    throw new Error('Failed to generate Viewing Key');
  }
}
