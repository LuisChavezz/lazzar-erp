import { expect, test } from "@playwright/test";
import { AxiosError, AxiosHeaders } from "axios";
import {
  candidateLineTopes,
  refreshCandidate,
  salidaMaquilaDesenlace,
} from "@/src/features/receipts/utils/receiptCandidates";
import { recortarCantidades } from "@/src/features/receipts/utils/receiptQuantities";
import { buildReceiptPayload } from "@/src/features/receipts/utils/buildReceiptPayload";
import { receiptLineErrors, receiptPayloadLineIds } from "@/src/features/receipts/utils/receiptErrors";
import { supplierInvoiceToOpen } from "@/src/features/supplier-invoices/utils/supplierInvoicesListQuery";
import type {
  ReceiptOnboardingProductionOrder,
  ReceiptOnboardingSalidaMaquila,
  ReceiptOnboardingSearch,
  ReceiptOrderCandidate,
} from "@/src/features/receipts/interfaces/receipt-onboarding.interface";

/** EC-919, correcciones de la revisión: candidato fresco tras un 400, resumen y `?factura=`. */

const renglon = (id: number, pendienteSm: string | null, pendienteOp = "10") => ({
  id,
  producto_id: 1,
  producto_variante_id: 70 + id,
  producto_nombre: `Prenda ${id}`,
  cantidad_ordenada: "50",
  cantidad_recibida: "0",
  cantidad_pendiente: pendienteOp,
  descripcion: null,
  salidas_maquila: pendienteSm === null ? [] : [{ id: 47, folio: "SM-00024", cantidad_pendiente: pendienteSm }],
});

const op = (r1: string | null, r2: string | null): ReceiptOnboardingProductionOrder => ({
  id: 74,
  folio: "2026-OP-00028",
  estatus: 2,
  pedido_id: null,
  sucursal_id: 1,
  fecha_inicio: "2026-11-01",
  cerrar_orden: false,
  detalle: [renglon(121, r1), renglon(122, r2)],
});

const sm: ReceiptOnboardingSalidaMaquila = {
  id: 47,
  folio: "SM-00024",
  folio_display: "SM-00024 · 2026-OP-00028",
  origen: "OP",
  origen_folio: "2026-OP-00028",
  op_id: 74,
  centro_confeccion: 8,
  centro_confeccion_nombre: "PRUEBA",
  sucursal_id: 1,
  fecha_envio: "2026-11-21",
  total_piezas: 5,
  piezas_pendientes: 3,
};

const busqueda = (ops: ReceiptOnboardingProductionOrder[], sms: ReceiptOnboardingSalidaMaquila[]): ReceiptOnboardingSearch => ({
  ordenes_compra: [],
  ordenes_produccion: ops,
  salidas_maquila: sms,
});

const vieja: ReceiptOrderCandidate = { type: "produccion", order: op("1.00", "2.00"), salidaMaquila: sm };

test("rearma la SM de OP con los topes frescos", () => {
  const fresca = refreshCandidate(vieja, busqueda([op("0.00", "2.00")], [{ ...sm, piezas_pendientes: 2 }]));
  expect(fresca?.type).toBe("produccion");
  expect(candidateLineTopes(vieja).get(121)).toBe(1);
  expect(candidateLineTopes(fresca!).get(121)).toBe(0);
  expect(candidateLineTopes(fresca!).get(122)).toBe(2);
});

test("sin la orden o la SM en el onboarding no hay candidato", () => {
  expect(refreshCandidate(vieja, busqueda([op("0", "0")], []))).toBeNull();
  expect(refreshCandidate(vieja, busqueda([], [sm]))).toBeNull();
  const directa: ReceiptOrderCandidate = { type: "produccion", order: op(null, null), salidaMaquila: null };
  expect(refreshCandidate(directa, busqueda([op(null, null)], []))).toEqual(directa);
});

test("lo capturado se conserva y solo se recorta al tope nuevo", () => {
  const topes = new Map([
    [121, 0],
    [122, 2],
  ]);
  expect(recortarCantidades({ "121": "1", "122": "2" }, topes)).toEqual({ "121": "0" });
  expect(recortarCantidades({ "122": "1", "999": "3" }, topes)).toEqual({ "999": "0" });
});

test("#N se resuelve contra el detalle ENVIADO (sin los renglones en 0)", () => {
  const candidate: ReceiptOrderCandidate = {
    type: "produccion",
    order: { ...op(null, null), detalle: [renglon(120, null), renglon(121, null), renglon(122, null)] },
    salidaMaquila: null,
  };
  const payload = buildReceiptPayload(candidate, {
    almacen: 1,
    serie_codigo: "RC",
    remision: "",
    factura_referencia: "",
    observaciones: "",
    cantidades: { "120": "1", "121": "0", "122": "2" },
  });
  const ids = receiptPayloadLineIds(payload);
  expect(ids).toEqual([120, 122]);
  const error = new AxiosError("Bad Request", "ERR_BAD_REQUEST", undefined, undefined, {
    status: 400,
    statusText: "Bad Request",
    data: { detalle: ["El renglón #2 (orden_produccion_detalle 122) excede la cantidad pendiente por recibir."] },
    headers: {},
    config: { headers: new AxiosHeaders() },
  });
  expect(receiptLineErrors(error, ids).porRenglon).toEqual({ 122: "Excede la cantidad pendiente por recibir." });
});

test("resumen de la SM: con el cierre marcado queda Recibida con faltante", () => {
  expect(salidaMaquilaDesenlace({ capturadas: 0, pendientes: 3, cerrar: true })).toBe("nada");
  expect(salidaMaquilaDesenlace({ capturadas: 1, pendientes: 3, cerrar: false })).toBe("sigue-enviada");
  expect(salidaMaquilaDesenlace({ capturadas: 1, pendientes: 3, cerrar: true })).toBe("recibida-con-faltante");
  expect(salidaMaquilaDesenlace({ capturadas: 3, pendientes: 3, cerrar: false })).toBe("recibida");
});

test("?factura= solo abre el detalle si viene un filtro", () => {
  expect(supplierInvoiceToOpen({ proveedorId: null, salidaMaquilaId: null, facturaId: 1248 })).toBeNull();
  expect(supplierInvoiceToOpen({ proveedorId: 8, salidaMaquilaId: null, facturaId: 1248 })).toBe(1248);
  expect(supplierInvoiceToOpen({ proveedorId: null, salidaMaquilaId: 47, facturaId: 1248 })).toBe(1248);
});
