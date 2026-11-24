import { expect, test } from "@playwright/test";
import { AxiosError, AxiosHeaders } from "axios";
import { DEFAULT_QUERY_RETRY } from "@/src/constants/queryCache";
import { defaultQueryRetry } from "@/src/utils/defaultQueryRetry";
import { retryUnlessClientError } from "@/src/utils/retryUnlessClientError";

/**
 * EC-939: una consulta que venció su tope no se reintenta (duplicaría la espera
 * antes del error). Cualquier otro fallo conserva el `retry` de antes.
 */

const config = { headers: new AxiosHeaders() };
const timeout = new AxiosError("timeout of 30000ms exceeded", AxiosError.ETIMEDOUT, config);
const legacyTimeout = new AxiosError("timeout of 30000ms exceeded", AxiosError.ECONNABORTED, config);
const network = new AxiosError("Network Error", AxiosError.ERR_NETWORK, config);
const browserAbort = new AxiosError("Request aborted", AxiosError.ECONNABORTED, config);
const withStatus = (status: number) =>
  new AxiosError(`Request failed with status code ${status}`, "ERR_BAD_RESPONSE", config, undefined, {
    status,
    statusText: "",
    data: {},
    headers: {},
    config,
  });

for (const [name, retry] of [
  ["defaultQueryRetry", defaultQueryRetry],
  ["retryUnlessClientError", retryUnlessClientError],
] as const) {
  test(`${name} no reintenta un timeout`, () => {
    expect(retry(0, timeout)).toBe(false);
    expect(retry(0, legacyTimeout)).toBe(false);
  });

  test(`${name} sigue reintentando la red caída, el aborto y un 5xx`, () => {
    for (const error of [network, browserAbort, withStatus(500), withStatus(503)]) {
      expect(retry(0, error)).toBe(true);
      expect(retry(DEFAULT_QUERY_RETRY, error)).toBe(false);
    }
  });
}

test("retryUnlessClientError conserva su regla de 4xx (y 408/429 se reintentan)", () => {
  expect(retryUnlessClientError(0, withStatus(404))).toBe(false);
  expect(retryUnlessClientError(0, withStatus(403))).toBe(false);
  expect(retryUnlessClientError(0, withStatus(408))).toBe(true);
  expect(retryUnlessClientError(0, withStatus(429))).toBe(true);
  // El global no mira el estatus: un 404 se reintenta como antes.
  expect(defaultQueryRetry(0, withStatus(404))).toBe(true);
});
