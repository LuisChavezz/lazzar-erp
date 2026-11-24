import { expect, test } from "@playwright/test";
import http from "node:http";
import type { AddressInfo } from "node:net";
import { AxiosError, AxiosHeaders, CanceledError } from "axios";
import { api } from "@/src/api/api";
import { v1_api } from "@/src/api/v1.api";
import { DEFAULT_REQUEST_TIMEOUT_MS } from "@/src/constants/httpTimeouts";
import { isActionOutcomeUnknown } from "@/src/utils/actionOutcome";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { officialCfdiErrorMessage } from "@/src/utils/officialCfdiFile";
import { isRequestTimeoutError, REQUEST_TIMEOUT_MESSAGE } from "@/src/utils/requestTimeout";

/**
 * EC-939: `v1_api` y `api` llevan un tope de tiempo por defecto y
 * `clarifyTimeoutError`, así que un timeout llega como `ETIMEDOUT`.
 * `isRequestTimeoutError` lo distingue de un aborto del navegador y de una
 * cancelación, y los chequeos que ya existían lo siguen detectando.
 */

const config = { headers: new AxiosHeaders() };

/** Timeout de un cliente con `clarifyTimeoutError` (`v1_api`, `api`). */
const clarifiedTimeout = () =>
  new AxiosError("timeout of 30000ms exceeded", AxiosError.ETIMEDOUT, config);
/** Timeout de un cliente SIN `clarifyTimeoutError` (el código de antes de EC-939). */
const legacyTimeout = () =>
  new AxiosError("timeout of 30000ms exceeded", AxiosError.ECONNABORTED, config);
/** Petición que abortó el navegador (`onabort` del XHR): mismo código, no es un timeout. */
const browserAbort = () => new AxiosError("Request aborted", AxiosError.ECONNABORTED, config);
const networkError = () => new AxiosError("Network Error", AxiosError.ERR_NETWORK, config);

test("isRequestTimeoutError reconoce ETIMEDOUT y el ECONNABORTED de un timeout", () => {
  expect(isRequestTimeoutError(clarifiedTimeout())).toBe(true);
  expect(isRequestTimeoutError(legacyTimeout())).toBe(true);
});

test("isRequestTimeoutError descarta el aborto del navegador, la cancelación y la red caída", () => {
  expect(isRequestTimeoutError(browserAbort())).toBe(false);
  expect(isRequestTimeoutError(new CanceledError(undefined, undefined, config))).toBe(false);
  expect(isRequestTimeoutError(networkError())).toBe(false);
  expect(isRequestTimeoutError(new Error("timeout of 30000ms exceeded"))).toBe(false);
  expect(isRequestTimeoutError(undefined)).toBe(false);
});

test("extractErrorMessage devuelve el mensaje de timeout antes que el fallback", () => {
  expect(extractErrorMessage(clarifiedTimeout(), "No se pudo guardar.")).toBe(REQUEST_TIMEOUT_MESSAGE);
  expect(extractErrorMessage(legacyTimeout(), "No se pudo guardar.")).toBe(REQUEST_TIMEOUT_MESSAGE);
  // Cualquier otro error de Axios conserva su fallback.
  expect(extractErrorMessage(browserAbort(), "No se pudo guardar.")).toBe("No se pudo guardar.");
  expect(extractErrorMessage(networkError(), "No se pudo guardar.")).toBe("No se pudo guardar.");
});

test("isActionOutcomeUnknown sigue detectando el timeout con ETIMEDOUT", () => {
  expect(isActionOutcomeUnknown(clarifiedTimeout())).toBe(true);
  expect(isActionOutcomeUnknown(legacyTimeout())).toBe(true);
  // Sin respuesta, el aborto del navegador también deja el resultado sin confirmar.
  expect(isActionOutcomeUnknown(browserAbort())).toBe(true);
});

test("officialCfdiErrorMessage trata ETIMEDOUT como timeout y el aborto como sin respuesta", () => {
  expect(officialCfdiErrorMessage(clarifiedTimeout(), "de la factura")).toBe(
    "Facturama no entregó el archivo. Intenta de nuevo más tarde.",
  );
  expect(officialCfdiErrorMessage(browserAbort(), "de la factura")).toBe(
    "No se recibió respuesta del servidor. Intenta de nuevo.",
  );
});

test("v1_api y api llevan el tope por defecto sin perder los transitional de Axios", () => {
  for (const client of [v1_api, api]) {
    expect(client.defaults.timeout).toBe(DEFAULT_REQUEST_TIMEOUT_MS);
    expect(client.defaults.transitional).toMatchObject({
      clarifyTimeoutError: true,
      forcedJSONParsing: true,
      silentJSONParsing: true,
    });
  }
});

/** Servidor local que acepta la conexión y responde según `handler`. */
const withServer = async (
  handler: http.RequestListener,
  run: (baseURL: string) => Promise<void>,
) => {
  const server = http.createServer(handler);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;
  try {
    await run(`http://127.0.0.1:${port}`);
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
};

test("una petición de v1_api que vence su tope rechaza con ETIMEDOUT y respeta el tope por llamada", async () => {
  const previous = { baseURL: v1_api.defaults.baseURL, adapter: v1_api.defaults.adapter };
  try {
    await withServer(
      (req, res) => {
        if (req.url === "/json/") {
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ ok: true }));
        }
        // Cualquier otra ruta queda sin responder.
      },
      async (baseURL) => {
        Object.assign(v1_api.defaults, { baseURL, adapter: "http" });
        // El JSON se sigue parseando con `transitional` fusionado.
        await expect(v1_api.get("/json/").then((r) => r.data)).resolves.toEqual({ ok: true });

        const started = Date.now();
        const failure = await v1_api.get("/hang/", { timeout: 200 }).catch((error: unknown) => error);
        expect(Date.now() - started).toBeLessThan(2_000);
        expect(failure).toBeInstanceOf(AxiosError);
        expect((failure as AxiosError).code).toBe(AxiosError.ETIMEDOUT);
        expect(isRequestTimeoutError(failure)).toBe(true);
        expect(extractErrorMessage(failure, "fallback")).toBe(REQUEST_TIMEOUT_MESSAGE);
      },
    );
  } finally {
    Object.assign(v1_api.defaults, previous);
  }
});
