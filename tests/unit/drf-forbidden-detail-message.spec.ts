import { expect, test } from "@playwright/test";
import { AxiosError, AxiosHeaders } from "axios";
import { forbiddenDetailMessage, isForbiddenError } from "@/src/utils/drfWriteErrors";

/**
 * Pruebas unitarias de EC-733: `forbiddenDetailMessage` saca el motivo de un
 * `403` de DRF para que las escrituras de Finanzas sin `E-FIN-FACTURAS` lo
 * muestren en vez de un texto genérico, sin tocar ningún otro error. Corren con
 * `npm run test:unit`.
 */

const axiosError = (status: number, data?: unknown) =>
  new AxiosError(`Request failed with status code ${status}`, "ERR_BAD_REQUEST", undefined, undefined, {
    status,
    statusText: "",
    data,
    headers: {},
    config: { headers: new AxiosHeaders() },
  });

test("un 403 devuelve el detail del backend", () => {
  expect(
    forbiddenDetailMessage(axiosError(403, { detail: "No tienes permiso para modificar datos de finanzas." })),
  ).toBe("No tienes permiso para modificar datos de finanzas.");
});

test("un 403 sin mensaje devuelve undefined para caer al texto de siempre", () => {
  expect(forbiddenDetailMessage(axiosError(403))).toBeUndefined();
  expect(forbiddenDetailMessage(axiosError(403, "<html>Forbidden</html>"))).toBeUndefined();
});

test("un 403 sin detail no toma el valor de otra llave", () => {
  expect(forbiddenDetailMessage(axiosError(403, { comentarios: ["x"] }))).toBeUndefined();
  expect(forbiddenDetailMessage(axiosError(403, { non_field_errors: ["y"] }))).toBeUndefined();
  expect(forbiddenDetailMessage(axiosError(403, { detail: ["En lista."] }))).toBe("En lista.");
});

test("cualquier otro error devuelve undefined", () => {
  expect(forbiddenDetailMessage(axiosError(400, { detail: "Campo inválido" }))).toBeUndefined();
  expect(forbiddenDetailMessage(axiosError(500, { detail: "Server Error" }))).toBeUndefined();
  expect(forbiddenDetailMessage(new Error("red"))).toBeUndefined();
  expect(forbiddenDetailMessage(null)).toBeUndefined();
});

test("isForbiddenError solo reconoce un 403 de la API", () => {
  expect(isForbiddenError(axiosError(403))).toBe(true);
  expect(isForbiddenError(axiosError(404))).toBe(false);
  expect(isForbiddenError(axiosError(400))).toBe(false);
  expect(isForbiddenError(new Error("red"))).toBe(false);
  expect(isForbiddenError(null)).toBe(false);
});
