import React from "react";
import Form from "react-bootstrap/Form";

export function ReceiveFunds() {
  return (
    <Form>
      <Form.Text className="text-muted">
        Share one of these addresses to receive funds
      </Form.Text>
      <Form.Group className="mb-3" controlId="formReceive">
        <Form.Label>Unified Address:</Form.Label>
        <Form.Control type="text" disabled />
        <Form.Label>Transparent Address:</Form.Label>
        <Form.Control type="text" disabled />
      </Form.Group>
    </Form>
  );
}
