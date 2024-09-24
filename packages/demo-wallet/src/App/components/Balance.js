import Form from "react-bootstrap/Form";

export function Balance() {
  return (
    <Form>
      <Form.Group className="mb-3" controlId="formReceive">
        <Form.Label>Shielded ZEC (spendable):</Form.Label>
        <Form.Control type="text" disabled />
        <Form.Label>Change Pending:</Form.Label>
        <Form.Control type="text" disabled />
      </Form.Group>
    </Form>
  );
}
