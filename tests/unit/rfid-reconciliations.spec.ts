import { expect, test } from "@playwright/test";
import { AxiosError, AxiosHeaders } from "axios";
import {
  rfidReconciliationActions,
  rfidReconciliationLabel,
  rfidReconciliationOriginFolio,
} from "@/src/features/rfid-reconciliations/constants/rfidReconciliations";
import {
  classifyReadError,
  isEpcAlreadyRead,
  knownReadEpcs,
  normalizeEpc,
  readErrorFeedback,
  readPayload,
  readSuccessFeedback,
  unassignedReadReason,
} from "@/src/features/rfid-reconciliations/utils/rfidReadResult";
import {
  advanceFeedCursor,
  RFID_FEED_CURSOR_LIMIT,
  rfidScansQueryParams,
} from "@/src/features/rfid-scanner/utils/rfidScansParams";
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

test.describe("lectura sin asignar por EPC", () => {
  const unassigned = { producto_nombre: null, producto_variante_nombre: null, orden_compra_detalle: null, orden_produccion_detalle: null };

  test("muestra el motivo del backend", () => {
    expect(unassignedReadReason({ ...unassigned, metadata: { resolved: false, motivo: "epc_no_registrado" } })).toBe(
      "EPC no registrado",
    );
    expect(
      readSuccessFeedback({ ...unassigned, metadata: { resolved: false, motivo: "etiqueta_sin_producto" } }),
    ).toEqual({ tone: "warn", title: "Etiqueta sin producto", detail: "Queda sin asignar" });
  });
  test("un motivo desconocido se muestra tal cual y una asignada no tiene motivo", () => {
    expect(unassignedReadReason({ ...unassigned, metadata: { motivo: "otro_motivo" } })).toBe("otro_motivo");
    expect(unassignedReadReason({ ...unassigned, orden_compra_detalle: 1, metadata: {} })).toBeNull();
  });
});

test.describe("errores de lecturas/", () => {
  test("EPC repetido (400 epc con texto) es un aviso, no un error", () => {
    const dup = classifyReadError(axiosError(400, { epc: "Este tag ya fue leído en este encuadre." }));
    expect(dup.kind).toBe("duplicate");
    expect(readErrorFeedback(dup.kind, dup.message)).toMatchObject({ tone: "warn", title: "Ya leído" });
    // El envío obsoleto por codigo_tag responde igual.
    expect(classifyReadError(axiosError(400, { codigo_tag: "Este tag ya fue leído en este encuadre." })).kind).toBe(
      "duplicate",
    );
  });
  test("un 400 epc del serializer (lista) no es repetido", () => {
    expect(classifyReadError(axiosError(400, { epc: ["EPC vacío."] }))).toEqual({ kind: "other", message: "EPC vacío." });
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
    expect(classifyReadError(axiosError(400, { otro: ["Requerido."] }))).toEqual({ kind: "other", message: "Requerido." });
  });
});

test.describe("envío por EPC", () => {
  test("el cuerpo es {epc} con el EPC tal como llega de la antena", () => {
    expect(readPayload("e280-1160:00aa")).toEqual({ epc: "e280-1160:00aa" });
  });
  test("normaliza como el backend para comparar", () => {
    expect(normalizeEpc(" e2:80-11 60 ")).toBe("E2801160");
    expect(normalizeEpc(null)).toBe("");
  });
  test("conoce el EPC canónico y la forma que mandó el lector", () => {
    const known = knownReadEpcs([
      { codigo_tag: "E28011700000EC9610000001", metadata: { epc_leido: "E28011700000EC961000000100000000" } },
      { codigo_tag: "30018002XC", metadata: { tokens: ["30018002XC"] } },
    ]);
    expect(isEpcAlreadyRead("e28011700000ec9610000001", known, new Set())).toBe(true);
    expect(isEpcAlreadyRead("E28011700000EC961000000100000000", known, new Set())).toBe(true);
  });
  test("no reenvía lo ya mandado en la sesión; otra forma del EPC sí va al backend", () => {
    const sent = new Set([normalizeEpc("E28011700000EC9610000002")]);
    expect(isEpcAlreadyRead("E28011700000EC9610000002", new Set(), sent)).toBe(true);
    // Con relleno: el backend decide que es la misma pieza (400 epc → "Ya leído").
    expect(isEpcAlreadyRead("E28011700000EC961000000200000000", new Set(), sent)).toBe(false);
    expect(isEpcAlreadyRead("   ", new Set(), sent)).toBe(false);
  });
});

test.describe("cursor del feed de la antena", () => {
  const scans = (...ids: number[]) => ids.map((id) => ({ id }));

  test("la primera respuesta fija el cursor y no entrega nada", () => {
    expect(advanceFeedCursor(null, scans(41, 57, 12))).toEqual({ cursor: 57, fresh: [] });
    expect(advanceFeedCursor(null, [])).toEqual({ cursor: 0, fresh: [] });
  });
  test("después entrega solo lo posterior y avanza al id más alto", () => {
    expect(advanceFeedCursor(57, scans(60, 58))).toEqual({ cursor: 60, fresh: scans(60, 58) });
    expect(advanceFeedCursor(60, [])).toEqual({ cursor: 60, fresh: [] });
    // Algo anterior al cursor nunca se entrega ni lo hace retroceder.
    expect(advanceFeedCursor(60, scans(59))).toEqual({ cursor: 60, fresh: [] });
  });
  test("con cursor pide despues_de_id, unicos y limite 200", () => {
    expect(rfidScansQueryParams({ soloMatch: true, despuesDeId: 57, limite: RFID_FEED_CURSOR_LIMIT })).toEqual({
      unicos: 1,
      solo_match: 1,
      despues_de_id: 57,
      limite: 200,
    });
    expect(rfidScansQueryParams({ soloMatch: true, despuesDeId: 0, limite: 200 }).despues_de_id).toBe(0);
  });
  test("sin la opción la petición es la de siempre (Nueva Recepción y monitor)", () => {
    expect(rfidScansQueryParams({ soloMatch: true })).toEqual({ unicos: 1, solo_match: 1 });
    expect(rfidScansQueryParams({ soloMatch: false })).toEqual({ unicos: 1 });
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
