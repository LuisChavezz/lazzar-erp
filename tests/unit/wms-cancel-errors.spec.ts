import { expect, test } from "@playwright/test";
import { AxiosError, AxiosHeaders, type AxiosResponse } from "axios";
import {
  WMS_CANCEL_FORBIDDEN_MESSAGE,
  WMS_CANCEL_NOT_FOUND_MESSAGE,
  classifyWmsCancelError,
  wmsCancelErrorClosesDialog,
} from "@/src/features/wms-cancellations/utils/wmsCancelErrors";
import { isTransferRevertible } from "@/src/features/stock-transfers/utils/transferRevertAction";

/**
 * EC-945: cómo se muestran los errores de `cancelar/` (despacho, packing,
 * surtido) y `revertir/` (TR), con los cuerpos reales de nucleo-erp
 * `cancelacion_service` (#1348 y EC-949). Corren con `npm run test:unit`.
 */

const httpError = (status: number, data: unknown): AxiosError => {
  const config = { headers: new AxiosHeaders() };
  const response = { status, statusText: "", headers: {}, config, data } as AxiosResponse;
  return new AxiosError("Request failed", "ERR_BAD_REQUEST", config, undefined, response);
};

const FALLBACK = "Error al cancelar el embarque";

test("motivo faltante va bajo el campo", () => {
  const error = httpError(400, { motivo: "Indica el motivo de la cancelación." });
  expect(classifyWmsCancelError(error, FALLBACK)).toEqual({
    kind: "motivo",
    message: "Indica el motivo de la cancelación.",
  });
});

test("los 400 de orden y de cadena llegan tal cual y cierran el diálogo", () => {
  const cases = [
    { packing: "Tiene despachos activos: 54. Cancélalos primero." },
    { picking: "Tiene packing vivo: PACK-000018. Cancélalo primero." },
    { picking: "Tiene órdenes de trabajo vivas: OB-12. Cancélalas primero." },
    { despacho: "El despacho ya está cancelado." },
    { transferencia: "Sólo se revierte la última TR del picking PICK-1. Revierte primero TR-31." },
    { pedido: "Pedido no encontrado o sin acceso." },
  ];
  for (const body of cases) {
    const classified = classifyWmsCancelError(httpError(400, body), FALLBACK);
    expect(classified).toEqual({ kind: "blocked", message: Object.values(body)[0] });
    expect(wmsCancelErrorClosesDialog(classified)).toBe(true);
  }
});

test("la lista plana de revertir/ sin stock llega tal cual", () => {
  const message = "Inventario insuficiente del producto/variante con id 7 (disponible=1, solicitado=3).";
  expect(classifyWmsCancelError(httpError(400, [message]), FALLBACK)).toEqual({ kind: "blocked", message });
});

test("403 muestra su detail tal cual y no cierra", () => {
  const detail = "No tienes permiso para cancelar documentos de almacén.";
  const classified = classifyWmsCancelError(httpError(403, { detail }), FALLBACK);
  expect(classified).toEqual({ kind: "forbidden", message: detail });
  expect(wmsCancelErrorClosesDialog(classified)).toBe(false);
  expect(classifyWmsCancelError(httpError(403, "<html>"), FALLBACK).message).toBe(WMS_CANCEL_FORBIDDEN_MESSAGE);
});

test("404 cierra con su propio mensaje", () => {
  const classified = classifyWmsCancelError(httpError(404, { detail: "No encontrado." }), FALLBACK);
  expect(classified).toEqual({ kind: "not-found", message: WMS_CANCEL_NOT_FOUND_MESSAGE });
  expect(wmsCancelErrorClosesDialog(classified)).toBe(true);
});

test("red y 5xx caen al respaldo y no cierran", () => {
  const network = new AxiosError("Network Error", "ERR_NETWORK");
  expect(classifyWmsCancelError(network, FALLBACK)).toEqual({ kind: "other", message: FALLBACK });
  expect(classifyWmsCancelError(httpError(500, "<html>"), FALLBACK)).toEqual({ kind: "other", message: FALLBACK });
});

test("Revertir solo en una TR completada que no es reversa ni está revertida", () => {
  expect(isTransferRevertible({ status: "COMPLETADA", reversa_de: null, reversa: null })).toBe(true);
  expect(isTransferRevertible({ status: "COMPLETADA" })).toBe(true);
  expect(isTransferRevertible({ status: "CANCELADA", reversa_de: null, reversa: 9 })).toBe(false);
  expect(isTransferRevertible({ status: "COMPLETADA", reversa_de: 4, reversa: null })).toBe(false);
  expect(isTransferRevertible({ status: "COMPLETADA", reversa_de: null, reversa: 9 })).toBe(false);
  expect(isTransferRevertible({ status: "FALLIDA", reversa_de: null, reversa: null })).toBe(false);
});

test("el cambio concurrente de EC-949 deja el diálogo abierto para reintentar", () => {
  for (const message of [
    "La TR cambió mientras se revertía. Intenta de nuevo.",
    "La TR cambio mientras se revertia. INTENTALO DE NUEVO",
    "Otro proceso la modificó; vuelve a intentar.",
  ]) {
    const classified = classifyWmsCancelError(httpError(400, { transferencia: message }), FALLBACK);
    expect(classified).toEqual({ kind: "retryable", message });
    expect(wmsCancelErrorClosesDialog(classified)).toBe(false);
  }
  // Las reglas que no salen al reintentar siguen cerrando.
  const orden = classifyWmsCancelError(httpError(400, { packing: "Tiene despachos activos: 54. Cancélalos primero." }), FALLBACK);
  expect(orden.kind).toBe("blocked");
});
