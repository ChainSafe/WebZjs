import { Form, Box, Heading, Input, Button, Text } from "@metamask/snaps-sdk/jsx";

type BirthdayBlockForm = {customBirthdayBlock: number | null}

export async function setBirthdayBlock (): Promise<number | null> {

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

  await snap.request(
    {
      method: "snap_manageState",
      params: {
        operation: "update",
        newState: {
          customBirthdayBlock
        }
      }
    }
  )

  return customBirthdayBlock

}

