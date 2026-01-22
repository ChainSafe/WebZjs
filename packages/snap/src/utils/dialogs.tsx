import type { JSX } from '@metamask/snaps-sdk/jsx';
import { Box, Heading, Text, Link } from '@metamask/snaps-sdk/jsx';

export const installDialog = async () => {
  await snap.request({
    method: 'snap_dialog',
    params: {
      type: 'alert',
      content: (
        <Box>
          <Heading>Thank you for installing Zcash Shielded Wallet snap</Heading>
          <Text>
            This snap utilizes Zcash Web Wallet. Visit Zcash Web Wallet at{' '}
            <Link href="https://webzjs.chainsafe.dev/">
              webzjs.chainsafe.dev
            </Link>
            .
          </Text>
        </Box>
      ),
    },
  });
};

export const snapConfirm = async ({
  title,
  prompt
}: {
  title: string;
  prompt: JSX.Element;
}): Promise<boolean> => {
  const result = await snap.request({
    method: 'snap_dialog',
    params: {
      type: 'confirmation',
      content: (
        <Box>
          <Heading>{title}</Heading>
          {prompt}
        </Box>
      )
    }
  });

  return Boolean(result);
};
