import { expect, test } from "@playwright/test";
import { AxiosError, AxiosHeaders } from "axios";
import { parsePackingError } from "@/src/features/packing/hooks/useCreatePacking";
import { parseShipmentError } from "@/src/features/shipping/hooks/useCreateShipping";

/**
 * EC-914: los dos 400 nuevos del backend (#1224) llegan al usuario tal cual.
 * Cuerpos copiados de respuestas reales del backend (string plano por llave).
 */

const axios400 = (data: unknown) =>
  new AxiosError("Request failed", "ERR_BAD_REQUEST", undefined, undefined, {
    status: 400,
    statusText: "",
    data,
    headers: {},
    config: { headers: new AxiosHeaders() },
  });

test("packing de un picking fuera de APARTADOS: el mensaje del backend, sin recarga", () => {
  const message =
    "El picking PICK-000020 está en PRODUCTO TERMINADO; trasládalo a APARTADOS para empacarlo.";
  const parsed = parsePackingError(axios400({ picking: message }));
  expect(parsed.formError).toBe(message);
  expect(parsed.messages).toEqual([message]);
  // No es un dato desactualizado: el formulario no recarga, muestra el error.
  expect(parsed.staleData).toBe(false);
});

test("despacho sin existencia en el almacén actual: el mensaje del backend, sin recarga", () => {
  const message = "No hay existencia en APARTADOS para despachar BATA EJECUTIVA: faltan 2.";
  const parsed = parseShipmentError(axios400({ despacho_detalle: message }));
  expect(parsed.formError).toBe(message);
  expect(parsed.messages).toEqual([message]);
  expect(parsed.staleData).toBe(false);
});
