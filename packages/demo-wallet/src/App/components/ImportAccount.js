import { useContext, useState } from "react";

import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";

import { WalletContext } from "../App";

export function ImportAccount() {
  let webWallet = useContext(WalletContext);

  let [birthdayHeight, setBirthdayHeight] = useState(0);
  let [seedPhrase, setSeedPhrase] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    await webWallet.create_account(seedPhrase, 0, birthdayHeight);
  };

  return (
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
  );
}
