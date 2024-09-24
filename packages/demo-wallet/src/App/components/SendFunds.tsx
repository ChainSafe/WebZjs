import React from "react";

import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";

export function SendFunds() {
  return (
    <Form>
      <Form.Group className="mb-3" controlId="formSend">
      <Form.Label>From Account:</Form.Label>
      <Form.Select>
        <option>Account 1</option>
      </Form.Select>
        <Form.Label>To:</Form.Label>
        <Form.Control type="text" placeholder="Zcash z-address"/>
        <Form.Label>Amount:</Form.Label>
        <Form.Control type="number" placeholder="0.0" size="lg"/>
        <Form.Label>Memo (optional):</Form.Label>
        <Form.Control type="text" placeholder="memo text (max 512 bytes)"/>
      </Form.Group>
      <Button variant="primary" type="submit">
        Send
      </Button>
    </Form>
  );
}
