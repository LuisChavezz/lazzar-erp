import { expect, test } from "@playwright/test";
import { AxiosError, AxiosHeaders, type AxiosResponse } from "axios";
import { parseSupplierInvoiceError } from "@/src/features/supplier-invoices/utils/parseSupplierInvoiceError";

/**
 * Pruebas unitarias de EC-707: el `400` con `sucursal` de una factura de
 * proveedor (nucleo-erp #813) llega con la forma real de `ValidationError` del
 * serializer (string suelto) y se le suma qué hacer, porque la sucursal no es
 * un input.
 */

const httpError = (status: number, data: unknown): AxiosError => {
  const config = { headers: new AxiosHeaders() };
  const response = { status, statusText: "", headers: {}, config, data } as AxiosResponse;
  return new AxiosError("Request failed", "ERR_BAD_REQUEST", config, undefined, response);
};

test("sucursal distinta a la de la recepción: dice que elija otra OC o recepción", () => {
  const parsed = parseSupplierInvoiceError(
    httpError(400, { sucursal: "Debe ser la sucursal de la recepción." }),
  );
  expect(parsed.fieldErrors.sucursal).toContain("Debe ser la sucursal de la recepción.");
  expect(parsed.fieldErrors.sucursal).toContain("elige otra orden de compra o recepción");
  expect(parsed.messages).toEqual([parsed.fieldErrors.sucursal]);
});

test("los demás campos no llevan la indicación", () => {
  const parsed = parseSupplierInvoiceError(httpError(400, { oc: ["Orden de compra no pertenece a la empresa."] }));
  expect(parsed.fieldErrors.oc).toBe("Orden de compra no pertenece a la empresa.");
});
