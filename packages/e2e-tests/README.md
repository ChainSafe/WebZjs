# WebZJS e2e Tests

This package uses playwright to test the highest level API of WebZjs running in a browser. This allows testing the interaction of different WebWorkers with the page, as well as testing on different browsers.

## Writing Tests

New tests should be added as files named `.spec.ts` inside the `e2e` directory.

Tests should use the `page.evaluate` method from playwright to execute javascript code in the browser page where the wallet exists and return a result to the test runner to check. e.g.

```typescript
test('Test some webzjs functionality..', async ({ page }) => {
  // code here runs in the test runner (node), not in the browser
  let result = await page.evaluate(async () => {
    // everything here executes in the web page
    // - do something with window.webWallet..
    return // the result to the test runner
  });
  expect(result).toBe(something);
});
```

The provided page has already initialized the Wasm environment and created a web wallet accessible in tests as `window.webWallet`
