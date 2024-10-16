import React, { FormEvent, useContext, useState } from "react";

import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";
import { ToastContainer, toast } from "react-toastify";

import { WalletContext } from "../App";
import { addNewAccount, flushDbToStore } from "../Actions";

export function ImportAccount() {
  let {state, dispatch} = useContext(WalletContext);

  let [birthdayHeight, setBirthdayHeight] = useState(2657762);
  let [seedPhrase, setSeedPhrase] = useState("mix sample clay sweet planet lava giraffe hand fashion switch away pool rookie earth purity truly square trumpet goose move actor save jaguar volume");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await addNewAccount(state, dispatch, seedPhrase, birthdayHeight);
    toast.success("Account imported successfully", {
      position: "top-center",
      autoClose: 2000,
    });
    setBirthdayHeight(0);
    setSeedPhrase("");
    flushDbToStore(state, dispatch)
  };

  return (
    <div>
      <Form onSubmit={handleSubmit}>
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
