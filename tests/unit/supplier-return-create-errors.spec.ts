import { expect, test } from "@playwright/test";
import { AxiosError, AxiosHeaders, type AxiosResponse } from "axios";
import {
  routeSupplierReturnCreateError,
  SUPPLIER_RETURN_CREATE_FALLBACK_ERROR,
} from "@/src/features/supplier-returns/utils/supplierReturnCreateErrors";

/**
 * EC-951: cómo se reparte un fallo del alta de una devolución a proveedor
 * (`POST /compras/devoluciones-proveedor/`): bajo su control, en toast o
 * releyendo lo pendiente. Los `400` de esas vistas llegan como texto plano por
 * llave. Corren con `npm run test:unit`.
 */

const httpError = (status: number, data: unknown): AxiosError => {
  const config = { headers: new AxiosHeaders() };
  const response = { status, statusText: "", headers: {}, config, data } as AxiosResponse;
  return new AxiosError("Request failed", "ERR_BAD_REQUEST", config, undefined, response);
};

test("400 motivo: bajo el campo, sin toast ni relectura", () => {
  expect(routeSupplierReturnCreateError(httpError(400, { motivo: "Indica el motivo de la devolución." }))).toEqual({
    fieldErrors: [["motivo", "Indica el motivo de la devolución."]],
    toast: null,
    refreshPending: false,
  });
});

test("400 detalles: bajo la tabla y relee lo pendiente", () => {
  expect(
    routeSupplierReturnCreateError(httpError(400, { detalles: "Renglón 2: se pueden devolver hasta 0." })),
  ).toEqual({
    fieldErrors: [["detalles", "Renglón 2: se pueden devolver hasta 0."]],
    toast: null,
    refreshPending: true,
  });
});

test("400 calidad_inspeccion: bajo el selector y relee lo pendiente", () => {
  expect(
    routeSupplierReturnCreateError(httpError(400, { calidad_inspeccion: "La inspección está anulada." })),
  ).toEqual({
    fieldErrors: [["calidad_inspeccion", "La inspección está anulada."]],
    toast: null,
    refreshPending: true,
  });
});

test("400 folio: no cabe en un campo y sale en toast", () => {
  expect(
    routeSupplierReturnCreateError(
      httpError(400, { folio: "Serie DVP: no fue posible generar el folio." }),
    ),
  ).toEqual({ fieldErrors: [], toast: "Serie DVP: no fue posible generar el folio.", refreshPending: false });
});

test("403 sin C-WMS-RECEPCIONES: toast con el motivo del backend", () => {
  const route = routeSupplierReturnCreateError(
    httpError(403, { detail: "No tienes permiso para esta acción (C-WMS-RECEPCIONES)." }),
  );
  expect(route).toEqual({
    fieldErrors: [],
    toast: "No tienes permiso para esta acción (C-WMS-RECEPCIONES).",
    refreshPending: false,
  });
});

test("5xx o red: toast con el respaldo", () => {
  const fallback = { fieldErrors: [], toast: SUPPLIER_RETURN_CREATE_FALLBACK_ERROR, refreshPending: false };
  expect(routeSupplierReturnCreateError(httpError(500, "<!DOCTYPE html>"))).toEqual(fallback);
  expect(routeSupplierReturnCreateError(new Error("Network Error"))).toEqual(fallback);
});
