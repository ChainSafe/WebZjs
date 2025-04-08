import React, { FormEvent, useContext, useEffect, useState } from 'react';

import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import { toast, ToastContainer } from 'react-toastify';
import { generate_seed_phrase } from '@chainsafe/webzjs-keys';

import { WalletContext } from '../App';
import {
  addNewAccount,
  addNewAccountFromUfvk,
  flushDbToStore,
} from '../Actions';
import { NU5_ACTIVATION } from '../Constants';
import { useInvokeSnap, useMetaMask } from '../../hooks';
import { ConnectMetamaskButton } from './ConnectMetamaskButton';

export function AddAccount() {
  let { state, dispatch } = useContext(WalletContext);
  const { installedSnap } = useMetaMask();
  const invokeSnap = useInvokeSnap();

  let [birthdayHeight, setBirthdayHeight] = useState(0);
  let [seedPhrase, setSeedPhrase] = useState('');

  useEffect(() => {
    const fetchBirthday = async () => {
      let birthday = await state.webWallet?.get_latest_block();
      setBirthdayHeight(Number(birthday) || 0);
    };
    fetchBirthday();
  }, [state]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await addNewAccount(state, dispatch, seedPhrase, birthdayHeight);
    toast.success('Account imported successfully', {
      position: 'top-center',
      autoClose: 2000,
    });
    setBirthdayHeight(0);
    setSeedPhrase('');
    flushDbToStore(state, dispatch);
  };

  const handleMetamaskImport = async (e: FormEvent) => {
    e.preventDefault();
    const viewKey = (await invokeSnap({ method: 'getViewingKey' })) as string;

    await addNewAccountFromUfvk(state, dispatch, viewKey, birthdayHeight);
    toast.success('Account imported successfully', {
      position: 'top-center',
      autoClose: 2000,
    });

    setBirthdayHeight(0);
    setSeedPhrase('');
    flushDbToStore(state, dispatch);
  };

  const generateNewSeedPhrase = async () => {
    const newSeedPhrase = generate_seed_phrase();
    let birthday = await state.webWallet?.get_latest_block();
    setSeedPhrase(newSeedPhrase);
    setBirthdayHeight(Number(birthday) || 0);
  };

  return (
    <div>
      <Form onSubmit={handleSubmit}>
        <Button
          variant="secondary"
          onClick={async () => await generateNewSeedPhrase()}
        >
          Generate New
        </Button>
        <Form.Group className="mb-3" controlId="seedPhrase">
          <Form.Label>Seed Phrase</Form.Label>
          <Form.Control
            as="textarea"
            placeholder="Enter 24 word seed phrase"
            value={seedPhrase}
            onChange={({ target: { value } }) => setSeedPhrase(value)}
            rows={3}
          />
          <Form.Text className="text-muted">
            Do not import a seed phrase holding any significant funds into this
            wallet demo
          </Form.Text>
        </Form.Group>

        <Form.Group className="mb-3" controlId="birthdayHeight">
          <Form.Label>Birthday Block Height</Form.Label>
          <Form.Control
            type="number"
            placeholder="Birthday block height"
            value={birthdayHeight}
            onChange={({ target: { value } }) =>
              setBirthdayHeight(parseInt(value))
            }
            min={NU5_ACTIVATION}
          />
        </Form.Group>
        <Button variant="primary" type="submit">
          Import
        </Button>
        <ConnectMetamaskButton />
        <Button
          variant="primary"
          onClick={handleMetamaskImport}
          disabled={!installedSnap}
        >
          Import Metamask Account
        </Button>
      </Form>
      <ToastContainer />
    </div>
  );
}
