import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";

export function ImportAccount() {
  return (
    <Form>
      <Form.Group className="mb-3" controlId="formBasicEmail">
        <Form.Label>Seed Phrase</Form.Label>
        <Form.Control as="textarea" placeholder="Enter 24 word seed phrase" rows={3}/>
        <Form.Text className="text-muted">
          Do not import a seed phrase holding any significant funds into this wallet demo
        </Form.Text>
      </Form.Group>
      <Button variant="primary" type="submit">
        Import
      </Button>
    </Form>
  );
}
