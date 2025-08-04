import { Box, Heading, Text } from "@metamask/snaps-sdk/jsx";

export const installDialog = async () => {
  await snap.request({
    method: "snap_dialog",
    params: {
      type: "alert",
      content: (
        <Box>
          <Heading>Thank you for installing Zcash Shielded Wallet snap</Heading>
          <Text>
            This snap utilizes Zcash Web Wallet.
            Visit Zcash Web Wallet at <a href="https://webzjs.chainsafe.dev/">webzjs.chainsafe.dev</a>.
          </Text>
        </Box>
      ),
    },
  });
};