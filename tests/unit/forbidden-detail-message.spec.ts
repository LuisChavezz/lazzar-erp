import { expect, test } from "@playwright/test";
import { AxiosError, AxiosHeaders } from "axios";
import { forbiddenDetailMessage } from "@/src/utils/forbiddenDetailMessage";

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

test("cualquier otro error devuelve undefined", () => {
  expect(forbiddenDetailMessage(axiosError(400, { detail: "Campo inválido" }))).toBeUndefined();
  expect(forbiddenDetailMessage(axiosError(500, { detail: "Server Error" }))).toBeUndefined();
  expect(forbiddenDetailMessage(new Error("red"))).toBeUndefined();
  expect(forbiddenDetailMessage(null)).toBeUndefined();
});
