import React, { FormEvent, useContext, useState } from "react";

import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";
import { ToastContainer, toast } from "react-toastify";
import { generate_seed_phrase } from "@webzjs/webz-core";

import { WalletContext } from "../App";
import { addNewAccount, flushDbToStore } from "../Actions";
import { NU5_ACTIVATION } from "../Constants";

export function AddAccount() {
  let { state, dispatch } = useContext(WalletContext);

  let [birthdayHeight, setBirthdayHeight] = useState(NU5_ACTIVATION);
  let [seedPhrase, setSeedPhrase] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await addNewAccount(state, dispatch, seedPhrase, birthdayHeight);
    toast.success("Account imported successfully", {
      position: "top-center",
      autoClose: 2000,
    });
    setBirthdayHeight(NU5_ACTIVATION);
    setSeedPhrase("");
    flushDbToStore(state, dispatch);
  };

  const generateNewSeedPhrase = async () => {
    const newSeedPhrase = generate_seed_phrase();
    let birthday = await state.webWallet?.get_latest_block();
    setSeedPhrase(newSeedPhrase);
    setBirthdayHeight(Number(birthday) || NU5_ACTIVATION);
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
      </Form>
      <ToastContainer />
    </div>
  );
}
