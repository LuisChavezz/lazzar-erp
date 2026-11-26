import { expect, test } from "@playwright/test";
import { AxiosError, AxiosHeaders } from "axios";
import {
  rfidReconciliationActions,
  rfidReconciliationLabel,
  rfidReconciliationOriginFolio,
} from "@/src/features/rfid-reconciliations/constants/rfidReconciliations";
import {
  antennaTagCode,
  classifyReadError,
  normalizeTag,
  readErrorFeedback,
  readSuccessFeedback,
} from "@/src/features/rfid-reconciliations/utils/rfidReadResult";
import { buildCreateRfidReconciliationPayload } from "@/src/features/rfid-reconciliations/utils/rfidReconciliationPayload";
import { rfidReconciliationsTable } from "@/src/features/rfid-reconciliations/constants/rfidReconciliationsTable";
import { readServerTableState, serverTableRequest } from "@/src/utils/serverTableParams";
import { limitOffsetAdapter } from "@/src/utils/serverListAdapters";

/**
 * EC-961: encuadres RFID de recepción. Reglas puras de la pantalla: qué
 * acciones se ofrecen por estatus, cómo se nombra el encuadre, qué significa
 * cada respuesta de `lecturas/` y el cuerpo del alta. Corren con
 * `npm run test:unit`.
 */

const axiosError = (status: number, data: unknown) =>
  new AxiosError("error", String(status), undefined, undefined, {
    status,
    statusText: "",
    data,
    headers: {},
    config: { headers: new AxiosHeaders() },
  });

test.describe("acciones por estatus", () => {
  test("pendiente: escanear, aceptar y cancelar", () => {
    expect(rfidReconciliationActions("PENDIENTE")).toEqual({ canScan: true, canAccept: true, canCancel: true });
  });
  test("aceptado: solo cancelar", () => {
    expect(rfidReconciliationActions("ACEPTADO")).toEqual({ canScan: false, canAccept: false, canCancel: true });
  });
  test("cancelado: nada", () => {
    expect(rfidReconciliationActions("CANCELADO")).toEqual({ canScan: false, canAccept: false, canCancel: false });
  });
});

test.describe("nombre del encuadre", () => {
  test("usa el folio de la OC o de la OP según el origen", () => {
    expect(rfidReconciliationLabel({ id: 7, tipo_origen: "OC", orden_compra_folio: "OC-00045", op_folio: null })).toBe(
      "Encuadre #7 · OC-00045",
    );
    expect(rfidReconciliationOriginFolio({ tipo_origen: "OP", orden_compra_folio: "OC-1", op_folio: "OP-0003" })).toBe(
      "OP-0003",
    );
  });
  test("sin folio queda el id", () => {
    expect(rfidReconciliationLabel({ id: 7, tipo_origen: "OC", orden_compra_folio: "  ", op_folio: null })).toBe(
      "Encuadre #7",
    );
  });
});

test.describe("resultado de una lectura", () => {
  const base = { producto_nombre: "Camisa", producto_variante_nombre: "Camisa - Azul - M", metadata: { resolved: true } };

  test("sumada a un renglón de la OC o de la OP", () => {
    expect(readSuccessFeedback({ ...base, orden_compra_detalle: 3, orden_produccion_detalle: null })).toEqual({
      tone: "ok",
      title: "Sumada",
      detail: "Camisa - Azul - M",
    });
    expect(readSuccessFeedback({ ...base, orden_compra_detalle: null, orden_produccion_detalle: 9 }).tone).toBe("ok");
  });
  test("producto conocido que no es de la orden", () => {
    expect(readSuccessFeedback({ ...base, orden_compra_detalle: null, orden_produccion_detalle: null })).toMatchObject({
      tone: "warn",
      title: "No es de esta orden",
    });
  });
  test("código sin producto", () => {
    expect(
      readSuccessFeedback({
        producto_nombre: null,
        producto_variante_nombre: null,
        metadata: { resolved: false },
        orden_compra_detalle: null,
        orden_produccion_detalle: null,
      }),
    ).toMatchObject({ tone: "warn", title: "Código no reconocido" });
  });
});

test.describe("errores de lecturas/", () => {
  test("tag repetido (texto plano o lista) es un aviso, no un error", () => {
    const plain = classifyReadError(axiosError(400, { codigo_tag: "Este tag ya fue leído en este encuadre." }));
    expect(plain.kind).toBe("duplicate");
    expect(classifyReadError(axiosError(400, { codigo_tag: ["Este tag ya fue leído en este encuadre."] })).kind).toBe(
      "duplicate",
    );
    expect(readErrorFeedback(plain.kind, plain.message)).toMatchObject({ tone: "warn", title: "Ya leído" });
  });
  test("encuadre que ya no está pendiente detiene la cola con el mensaje del backend", () => {
    expect(classifyReadError(axiosError(400, { estatus: "Solo se puede escanear un encuadre pendiente." }))).toEqual({
      kind: "not-pending",
      message: "Solo se puede escanear un encuadre pendiente.",
    });
  });
  test("404, 403 y otro 400", () => {
    expect(classifyReadError(axiosError(404, { detail: "No encontrado." })).kind).toBe("not-found");
    expect(classifyReadError(axiosError(403, { detail: "No tienes permiso para esta acción (C-WMS-RECEPCIONES)." })))
      .toEqual({ kind: "forbidden", message: "No tienes permiso para esta acción (C-WMS-RECEPCIONES)." });
    expect(classifyReadError(axiosError(400, { codigo_tag_x: ["Requerido."] }))).toEqual({
      kind: "other",
      message: "Requerido.",
    });
  });
  test("el código se envía recortado y vacío no se envía", () => {
    expect(normalizeTag("  SKU-1 \n")).toBe("SKU-1");
    expect(normalizeTag("   ")).toBe("");
  });
});

test.describe("codigo_tag de la antena", () => {
  test("EPC y SKU: único por pieza y asignable por el SKU", () => {
    expect(antennaTagCode({ epc: "E2801160AA", sku: "30018002XC", barcode_value: "30018002XC" })).toBe(
      "E2801160AA 30018002XC",
    );
  });
  test("sin SKU usa el código impreso; sin código, solo el EPC", () => {
    expect(antennaTagCode({ epc: "E1", sku: null, barcode_value: "018Q" })).toBe("E1 018Q");
    expect(antennaTagCode({ epc: "E1", sku: undefined, barcode_value: "" })).toBe("E1");
  });
  test("sin EPC no se manda nada y nunca pasa de 120 caracteres", () => {
    expect(antennaTagCode({ epc: " ", sku: "X", barcode_value: "X" })).toBe("");
    expect(antennaTagCode({ epc: "E".repeat(64), sku: "S".repeat(80), barcode_value: null })).toHaveLength(120);
  });
  test("dos piezas del mismo SKU dan códigos distintos", () => {
    const a = antennaTagCode({ epc: "E1", sku: "SKU-1", barcode_value: "SKU-1" });
    const b = antennaTagCode({ epc: "E2", sku: "SKU-1", barcode_value: "SKU-1" });
    expect(a).not.toBe(b);
  });
});

test.describe("cuerpo del alta", () => {
  const values = { almacen: 4, serie_codigo: "RC", remision: " rem-1 ", factura_referencia: "", observaciones: "  " };

  test("OC: manda orden_compra y omite lo vacío", () => {
    const candidate = { type: "compra", order: { id: 45 } } as never;
    expect(buildCreateRfidReconciliationPayload(candidate, values)).toEqual({
      tipo_origen: "OC",
      orden_compra: 45,
      almacen: 4,
      serie_codigo: "RC",
      remision: "rem-1",
      factura_referencia: undefined,
      observaciones: undefined,
    });
  });
  test("OP: manda op, nunca orden_compra", () => {
    const candidate = { type: "produccion", order: { id: 12 }, salidaMaquila: null } as never;
    const payload = buildCreateRfidReconciliationPayload(candidate, values);
    expect(payload).toMatchObject({ tipo_origen: "OP", op: 12 });
    expect("orden_compra" in payload).toBe(false);
  });
});

test.describe("parámetros del listado", () => {
  test("siempre pagina y descarta un estatus inválido", () => {
    const url = new URLSearchParams("estatus=BORRADOR&tipo_origen=OP&almacen=3&search=OC-1&page=2");
    const state = readServerTableState(rfidReconciliationsTable, (key) => url.get(key));
    const params = serverTableRequest(rfidReconciliationsTable, state, limitOffsetAdapter());
    expect(params.estatus).toBeUndefined();
    expect(params).toMatchObject({ tipo_origen: "OP", almacen: "3", search: "OC-1", ordering: "-created_at,-id" });
    expect(typeof params.limit).toBe("number");
    expect(params.offset).toBe(params.limit);
  });
});
