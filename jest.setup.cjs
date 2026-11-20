/**
 * Entrada de `setupFilesAfterEnv` (ver `package.json`). CJS a propósito:
 * las fábricas de `jest.mock` se elevan al inicio del archivo y solo pueden
 * usar `require`. Extensión `.cjs` para que ESLint no lo trate como TypeScript.
 */
const { resetSecureStore } = require("./jest.setup.secretStore.cjs");

require("./jest.setup.mocks.cjs");

afterEach(() => {
  resetSecureStore();
});
