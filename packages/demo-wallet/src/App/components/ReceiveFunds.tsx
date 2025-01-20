import React, { useEffect, useState } from 'react';

import QRCode from 'react-qr-code';
import Form from 'react-bootstrap/Form';
import { useWebZjsContext } from '@webzjs/web-wallet/src/context/WebzjsContext';

export function ReceiveFunds() {
  let { state, dispatch } = useWebZjsContext();

  let [unifiedAddress, setUnifiedAddress] = useState('');

  useEffect(() => {
    const updateUnifiedAddress = async () => {
      if (state.webWallet && state.activeAccount !== undefined) {
        let address = await state.webWallet.get_current_address(
          state.activeAccount || 0,
        );
        setUnifiedAddress(address);
      }
    };
    updateUnifiedAddress();
  }, [state]);

  return (
    <Form>
      <Form.Text className="text-muted">
        Share this addresses to receive funds
      </Form.Text>
      <Form.Group className="mb-3" controlId="formReceive">
        <Form.Label>Unified Address:</Form.Label>
        <Form.Control type="text" disabled value={unifiedAddress} />
      </Form.Group>
      <div style={{ background: 'white', padding: '16px' }}>
        <QRCode value={unifiedAddress} />
      </div>
    </Form>
  );
}
