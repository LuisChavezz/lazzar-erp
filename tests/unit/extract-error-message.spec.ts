import { expect, test } from "@playwright/test";
import { AxiosError, AxiosHeaders } from "axios";
import {
  CHUNK_LOAD_ERROR_MESSAGE,
  extractErrorMessage,
} from "@/src/utils/extractErrorMessage";

/**
 * Pruebas unitarias de EC-700: `extractErrorMessage` traduce el fallo al
 * descargar un chunk (`ChunkLoadError`) a un mensaje genérico legible, sin
 * cambiar lo que devuelve para cualquier otro error. Corren con
 * `npm run test:unit`.
 */

const axiosError = (data?: unknown) =>
  new AxiosError("Request failed with status code 400", "ERR_BAD_REQUEST", undefined, undefined, {
    status: 400,
    statusText: "Bad Request",
    data,
    headers: {},
    config: { headers: new AxiosHeaders() },
  });

test("un ChunkLoadError devuelve el mensaje genérico, no el del bundler", () => {
  const error = new Error("Failed to load chunk /_next/static/chunks/x.js from module 123");
  error.name = "ChunkLoadError";

  expect(extractErrorMessage(error, "fallback")).toBe(CHUNK_LOAD_ERROR_MESSAGE);
});

test("el resto de los errores conserva el comportamiento de siempre", () => {
  expect(extractErrorMessage(axiosError({ error: "Del backend" }), "fallback")).toBe("Del backend");
  expect(extractErrorMessage(axiosError({ detail: "x" }), "fallback")).toBe("fallback");
  expect(extractErrorMessage(new Error("Mensaje propio"), "fallback")).toBe("Mensaje propio");
  expect(extractErrorMessage("texto", "fallback")).toBe("fallback");
  expect(extractErrorMessage(null, "fallback")).toBe("fallback");
});
