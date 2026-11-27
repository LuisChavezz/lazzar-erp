import { expect, test } from "@playwright/test";
import { AxiosError, AxiosHeaders } from "axios";
import { QueryClient, QueryObserver } from "@tanstack/react-query";
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
  cursorFeedPageParams,
  drainFeedAfterCursor,
  nextCursorFeedMount,
  nextCursorFeedSession,
  rfidCursorScansKey,
  RFID_FEED_CURSOR_LIMIT,
  ScanOutbox,
  rfidScansQueryParams,
  type CursorFeedSession,
} from "@/src/features/rfid-scanner/utils/rfidScansParams";
import { rfidLectorListo } from "@/src/features/rfid-scanner/utils/rfidLectorListo";
import { buildCreateRfidReconciliationPayload } from "@/src/features/rfid-reconciliations/utils/rfidReconciliationPayload";
import { rfidReconciliationsTable } from "@/src/features/rfid-reconciliations/constants/rfidReconciliationsTable";
import { readServerTableState, serverTableRequest } from "@/src/utils/serverTableParams";
import { limitOffsetAdapter } from "@/src/utils/serverListAdapters";
import {
  acceptAvailability,
  nextCaptureState,
  reconciliationBalance,
  rowBalance,
} from "@/src/features/rfid-reconciliations/utils/rfidReconciliationBalance";
import {
  EMPTY_READ_TALLY,
  RfidReadQueueCore,
  tallyRead,
  type RfidReadOutcome,
} from "@/src/features/rfid-reconciliations/utils/rfidReadQueueCore";
import {
  refreshDetailAfterReads,
  refreshListAfterReading,
} from "@/src/features/rfid-reconciliations/utils/rfidReconciliationCache";
import type { RfidReconciliationRead } from "@/src/features/rfid-reconciliations/interfaces/rfid-reconciliation.interface";

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
    expect(advanceFeedCursor(57, scans(60, 58))).toEqual({ cursor: 60, fresh: scans(58, 60) });
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
  test("con lector elegido lo manda junto con el cursor", () => {
    expect(rfidScansQueryParams({ soloMatch: true, lector: 3, despuesDeId: 57, limite: 200 })).toEqual({
      unicos: 1,
      solo_match: 1,
      lector: 3,
      despues_de_id: 57,
      limite: 200,
    });
    expect(rfidScansQueryParams({ soloMatch: true, lector: null })).toEqual({ unicos: 1, solo_match: 1 });
  });
  test("el arranque del cursor va sin solo_match ni unicos, solo con lector; los sondeos los conservan (EC-997)", () => {
    const filtros = { soloMatch: true, lector: 9 };
    expect(rfidScansQueryParams({ ...filtros, ...cursorFeedPageParams(null) })).toEqual({ lector: 9, limite: 1 });
    expect(rfidScansQueryParams({ ...filtros, ...cursorFeedPageParams(104090) })).toEqual({
      unicos: 1,
      solo_match: 1,
      lector: 9,
      despues_de_id: 104090,
      limite: 200,
    });
  });
  test("una lectura vieja que se liga después no entra: el arranque toma el id más alto de todas (EC-997)", async () => {
    // La 4000 es la última ya ligada; 5000-5029 son tags aún sin etiqueta del ERP, leídos antes de Iniciar.
    const rows = [
      { id: 4000, ligada: true },
      ...Array.from({ length: 30 }, (_, i) => ({ id: 5000 + i, ligada: false })),
    ];
    const fetchPage = async (cursor: number | null) => {
      const { soloMatch = true, despuesDeId } = cursorFeedPageParams(cursor);
      const visibles = rows.filter((r) => !soloMatch || r.ligada);
      return despuesDeId === undefined
        ? [...visibles].sort((a, b) => b.id - a.id).slice(0, 1)
        : visibles.filter((r) => r.id > despuesDeId).sort((a, b) => a.id - b.id);
    };
    const start = await drainFeedAfterCursor(null, fetchPage);
    expect(start.cursor).toBe(5029);
    // Se imprime la etiqueta de la 5010 (`ligar_lecturas_previas`) y llega una lectura nueva ya ligada.
    rows[11].ligada = true;
    rows.push({ id: 5030, ligada: true });
    expect((await drainFeedAfterCursor(start.cursor, fetchPage)).fresh.map((r) => r.id)).toEqual([5030]);
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

test.describe("aceptar solo con la lectura en pausa y la cola vacía", () => {
  test("bloqueado mientras se lee o quedan lecturas por enviar, con su motivo", () => {
    expect(acceptAvailability({ estatus: "PENDIENTE", reading: true, pendingReads: 0 })).toEqual({
      allowed: false,
      reason: "Pausa la lectura para aceptar.",
    });
    expect(acceptAvailability({ estatus: "PENDIENTE", reading: false, pendingReads: 3 })).toEqual({
      allowed: false,
      reason: "Espera a que terminen de enviarse las lecturas.",
    });
  });
  test("permitido en pausa y con la cola vacía; nunca fuera de PENDIENTE", () => {
    expect(acceptAvailability({ estatus: "PENDIENTE", reading: false, pendingReads: 0 })).toEqual({
      allowed: true,
      reason: null,
    });
    expect(acceptAvailability({ estatus: "ACEPTADO", reading: false, pendingReads: 0 }).allowed).toBe(false);
  });
});

test.describe("cuadre por renglón", () => {
  const line = (esperado: string, leido: string) => ({
    detalle_id: 1,
    producto_id: 1,
    producto_nombre: "Gorra",
    producto_variante_id: 1,
    producto_variante_sku: "G-1",
    producto_variante_talla: "UNI",
    ordenado: esperado,
    ya_recibido: "0",
    esperado,
    leido,
    diferencia: String(Number(esperado) - Number(leido)),
  });

  test("lecturas de otro producto: diferencia distinta de 0 y no cuadra", () => {
    // El backend: total_leido 2 y completo true, aunque nada sumó a un renglón.
    const balance = reconciliationBalance({ detalle: [line("2.0000", "0.0000")], total_sin_asignar: "2.0000" });
    expect(balance).toMatchObject({ esperado: 2, leido: 0, sinAsignar: 2, diferencia: 2, cuadra: false });
  });
  test("dos renglones que se compensan no cuadran", () => {
    const balance = reconciliationBalance({
      detalle: [line("2", "3"), line("2", "1")],
      total_sin_asignar: "0",
    });
    expect(balance.diferencia).toBe(0);
    expect(balance.renglonesConDiferencia).toBe(2);
    expect(balance.cuadra).toBe(false);
  });
  test("cuadra solo sin diferencias ni lecturas sin asignar", () => {
    expect(reconciliationBalance({ detalle: [line("2", "2")], total_sin_asignar: "0" }).cuadra).toBe(true);
    expect(reconciliationBalance({ detalle: [line("2", "2")], total_sin_asignar: "1" }).cuadra).toBe(false);
  });
  test("la fila del listado cuenta como leído solo lo asignado", () => {
    expect(rowBalance({ total_esperado: "2", total_leido: "2", total_sin_asignar: "2" })).toEqual({
      esperado: 2,
      leido: 0,
      sinAsignar: 2,
      cuadra: false,
    });
    expect(rowBalance({ total_esperado: "2", total_leido: "2", total_sin_asignar: "0" }).cuadra).toBe(true);
  });
});

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

const savedRead = (epc: string): RfidReconciliationRead => ({
  id: 1,
  codigo_tag: epc,
  epc,
  etiqueta: 1,
  orden_compra_detalle: null,
  orden_produccion_detalle: 19,
  producto: 1,
  producto_nombre: "Gorra",
  producto_variante: 1,
  producto_variante_nombre: "Gorra - Caqui - UNI",
  cantidad_leida: "1.0000",
  metadata: { resolved: true, source: "EPC", epc_leido: epc },
  created_at: "2026-11-27T10:00:00-06:00",
});

const makeQueue = (send: (epc: string) => Promise<RfidReconciliationRead>) => {
  const calls = { sent: [] as string[], stops: [] as string[], drained: 0, added: 0, outcomes: [] as RfidReadOutcome[] };
  const core = new RfidReadQueueCore({
    send: (epc) => {
      calls.sent.push(epc);
      return send(epc);
    },
    onAdd: () => {
      calls.added += 1;
    },
    onUpdate: () => {},
    onPending: () => {},
    onStop: (message) => calls.stops.push(message),
    onDrained: () => {
      calls.drained += 1;
    },
    onOutcome: (outcome) => calls.outcomes.push(outcome),
  });
  return { core, calls };
};

test.describe("la cola se detiene y no vuelve a mandar", () => {
  for (const [name, error] of [
    ["400 estatus", axiosError(400, { estatus: "Solo se puede escanear un encuadre pendiente." })],
    ["404", axiosError(404, { detail: "No encontrado." })],
    ["403", axiosError(403, { detail: "No tienes permiso para esta acción (C-WMS-RECEPCIONES)." })],
  ] as const) {
    test(`tras un ${name}, lo pendiente se descarta y enqueue se ignora`, async () => {
      const { core, calls } = makeQueue(() => Promise.reject(error));
      core.enqueue("E1");
      core.enqueue("E2");
      await flush();
      expect(calls.sent).toEqual(["E1"]);
      expect(calls.stops).toHaveLength(1);
      expect(core.isStopped).toBe(true);
      core.enqueue("E3");
      await flush();
      expect(calls.sent).toEqual(["E1"]);
      expect(calls.added).toBe(2);
    });
  }
  test("un repetido no detiene la cola", async () => {
    const { core, calls } = makeQueue((epc) =>
      epc === "E1"
        ? Promise.reject(axiosError(400, { epc: "Este tag ya fue leído en este encuadre." }))
        : Promise.resolve(savedRead(epc)),
    );
    core.enqueue("E1");
    core.enqueue("E2");
    await flush();
    expect(calls.sent).toEqual(["E1", "E2"]);
    expect(core.isStopped).toBe(false);
  });
});

test.describe("relecturas durante la lectura continua", () => {
  test("una tanda avisa una vez al vaciarse", async () => {
    const { core, calls } = makeQueue((epc) => Promise.resolve(savedRead(epc)));
    core.enqueue("E1");
    core.enqueue("E2");
    core.enqueue("E3");
    await flush();
    expect(calls.sent).toEqual(["E1", "E2", "E3"]);
    expect(calls.drained).toBe(1);
  });
  test("tras una tanda se relee solo el detalle; el listado, al pausar o cerrar", () => {
    const invalidated: unknown[] = [];
    const queryClient = { invalidateQueries: (filters: unknown) => invalidated.push(filters) } as never;
    refreshDetailAfterReads(queryClient, 8);
    expect(invalidated).toEqual([{ queryKey: ["rfid-reconciliations", "detail", 8], exact: true }]);
    refreshListAfterReading(queryClient);
    expect(invalidated[1]).toEqual({ queryKey: ["rfid-reconciliations", "list"] });
  });
});

test.describe("cursor en orden ascendente con re-sondeo inmediato (EC-984)", () => {
  type Row = { id: number; created_at: number; lector?: number };
  /** Lecturas con `created_at` en el mismo orden que el `id` (el caso normal). */
  const ids = (from: number, to: number, lector?: number): Row[] =>
    Array.from({ length: to - from + 1 }, (_, i) => ({ id: from + i, created_at: from + i, lector }));
  /**
   * Feed falso con el contrato de `scans/` (EC-984): con cursor, `id`
   * ascendente y las primeras `limite`; sin cursor, `-created_at, -id`. Cada
   * página pide lo que manda el hook (`cursorFeedPageParams`) y se registra.
   */
  const fakeFeed = (rows: Row[], { failOnCall, lector }: { failOnCall?: number; lector?: number } = {}) => {
    const calls: (number | null)[] = [];
    const limits: (number | undefined)[] = [];
    const fetchPage = async (cursor: number | null) => {
      const { limite, despuesDeId } = cursorFeedPageParams(cursor);
      calls.push(cursor);
      limits.push(limite);
      if (failOnCall !== undefined && calls.length === failOnCall) throw new Error("red");
      const visibles = rows.filter((r) => lector === undefined || r.lector === lector);
      if (despuesDeId === undefined) {
        return [...visibles].sort((a, b) => b.created_at - a.created_at || b.id - a.id).slice(0, limite);
      }
      return visibles.filter((r) => r.id > despuesDeId).sort((a, b) => a.id - b.id).slice(0, limite);
    };
    return { fetchPage, calls, limits };
  };

  test("entrega en id ascendente aunque la respuesta llegue desordenada", () => {
    expect(advanceFeedCursor(10, [{ id: 13 }, { id: 11 }, { id: 12 }]).fresh.map((s) => s.id)).toEqual([11, 12, 13]);
  });
  test("más de 200 lecturas nuevas se piden seguidas, en orden y sin saltar ninguna", async () => {
    const feed = fakeFeed(ids(1001, 1450));
    const result = await drainFeedAfterCursor(1000, feed.fetchPage);
    expect(result.fresh.map((s) => s.id)).toEqual(ids(1001, 1450).map((s) => s.id));
    expect(result.cursor).toBe(1450);
    // 200 + 200 + 50: tres páginas en el mismo sondeo.
    expect(feed.calls).toEqual([1000, 1200, 1400]);
  });
  test("una página incompleta termina el sondeo; exactamente 200 pide una más", async () => {
    const corto = fakeFeed(ids(1001, 1150));
    expect((await drainFeedAfterCursor(1000, corto.fetchPage)).pages).toBe(1);
    const justo = fakeFeed(ids(1001, 1200));
    const result = await drainFeedAfterCursor(1000, justo.fetchPage);
    expect(justo.calls).toEqual([1000, 1200]);
    expect(result.fresh).toHaveLength(200);
  });
  test("al iniciar solo fija el cursor, sin paginar ni entregar", async () => {
    const feed = fakeFeed(ids(1, 900));
    const result = await drainFeedAfterCursor(null, feed.fetchPage);
    expect(result).toEqual({ cursor: 900, fresh: [], pages: 1 });
    expect(feed.calls).toEqual([null]);
  });
  test("el arranque pide limite=1 y los sondeos siguientes el tope, después del cursor (EC-997)", async () => {
    expect(cursorFeedPageParams(null)).toEqual({ limite: 1, soloMatch: false, unicos: false });
    expect(cursorFeedPageParams(0)).toEqual({ limite: RFID_FEED_CURSOR_LIMIT, despuesDeId: 0 });
    const feed = fakeFeed(ids(1, 900));
    const start = await drainFeedAfterCursor(null, feed.fetchPage);
    await drainFeedAfterCursor(start.cursor, feed.fetchPage);
    expect(feed.limits).toEqual([1, 200]);
    expect(feed.calls).toEqual([null, 900]);
  });
  test("sin cursor manda el más reciente por created_at, no el id más alto (caso aceptado)", async () => {
    // Dos `scans/receive/` cruzados: la 901 se confirmó antes que la 900 pero con fecha anterior.
    const feed = fakeFeed([...ids(1, 899), { id: 901, created_at: 899.5 }, { id: 900, created_at: 900 }]);
    expect((await drainFeedAfterCursor(null, feed.fetchPage)).cursor).toBe(900);
  });
  test("cambiar de lector arranca el cursor del nuevo sin traer su rezago (EC-997)", async () => {
    // El lector 9 lleva días sin leer; el 24 acumula 3000 lecturas desde entonces.
    const rows = [...ids(1, 50, 9), ...ids(51, 3050, 24)];
    // Lo que hace el hook: un cursor por sesión, y cada sesión arranca sin cursor.
    let feed: CursorFeedSession = nextCursorFeedSession({ enabled: false, lector: null, session: 0 }, true, 9);
    const cursors = new Map<number, number>();
    const poll = async () => {
      const result = await drainFeedAfterCursor(cursors.get(feed.session) ?? null, fakeFeed(rows, { lector: feed.lector ?? undefined }).fetchPage);
      cursors.set(feed.session, result.cursor);
      return result.fresh.map((r) => r.id);
    };
    expect(await poll()).toEqual([]);
    expect(cursors.get(feed.session)).toBe(50);

    feed = nextCursorFeedSession(feed, true, 24);
    expect(await poll()).toEqual([]);
    expect(cursors.get(feed.session)).toBe(3050);
    rows.push({ id: 3051, created_at: 3051, lector: 24 });
    expect(await poll()).toEqual([3051]);

    // Con el cursor del 9 (el error de antes) el primer sondeo del 24 traía su rezago.
    const reused = await drainFeedAfterCursor(50, fakeFeed(rows, { lector: 24 }).fetchPage);
    expect(reused.fresh).toHaveLength(3001);
  });
  test("un error en una página posterior corta sin perder lo recibido", async () => {
    const feed = fakeFeed(ids(1001, 1450), { failOnCall: 2 });
    const result = await drainFeedAfterCursor(1000, feed.fetchPage);
    expect(result.fresh.map((s) => s.id)).toEqual(ids(1001, 1200).map((s) => s.id));
    expect(result.cursor).toBe(1200);
    expect(feed.calls).toHaveLength(2);
  });
  test("un error en la primera página se propaga y el tope evita un ciclo sin fin", async () => {
    await expect(drainFeedAfterCursor(1000, async () => Promise.reject(new Error("red")))).rejects.toThrow("red");
    const feed = fakeFeed(ids(1001, 6000));
    const result = await drainFeedAfterCursor(1000, feed.fetchPage, { maxPages: 3 });
    expect(feed.calls).toHaveLength(3);
    expect(result.cursor).toBe(1600);
  });
});

test.describe("sesión del cursor por lector (EC-997)", () => {
  const start = { enabled: false, lector: null, session: 0 };
  test("encender empieza una sesión; sin cambios es el mismo objeto", () => {
    const on = nextCursorFeedSession(start, true, 9);
    expect(on).toEqual({ enabled: true, lector: 9, session: 1 });
    expect(nextCursorFeedSession(on, true, 9)).toBe(on);
  });
  test("cambiar de lector encendido empieza otra, también de null a un lector", () => {
    const sinLector = nextCursorFeedSession(start, true, null);
    const conLector = nextCursorFeedSession(sinLector, true, 24);
    expect(conLector.session).toBe(sinLector.session + 1);
    expect(nextCursorFeedSession(conLector, true, 9).session).toBe(conLector.session + 1);
  });
  test("apagar o cambiar de lector en pausa no empieza nada; volver a encender sí", () => {
    const on = nextCursorFeedSession(start, true, 9);
    const off = nextCursorFeedSession(on, false, 9);
    expect(off.session).toBe(on.session);
    const otroEnPausa = nextCursorFeedSession(off, false, 24);
    expect(otroEnPausa.session).toBe(on.session);
    expect(nextCursorFeedSession(otroEnPausa, true, 24).session).toBe(on.session + 1);
  });
});

test.describe("antena solo con el lector resuelto (EC-997)", () => {
  test("nada se pide mientras el catálogo de lectores no responde", () => {
    // Primer render: catálogo en vuelo, `lectores` vacío y `lectorId` null.
    expect(rfidLectorListo({ catalogoResuelto: false, lectores: 0, lectorId: null })).toBe(false);
    expect(rfidLectorListo({ catalogoResuelto: false, lectores: 2, lectorId: 9 })).toBe(false);
  });
  test("con el catálogo: un lector o el elegido sí; varios sin elegir no", () => {
    expect(rfidLectorListo({ catalogoResuelto: true, lectores: 1, lectorId: 9 })).toBe(true);
    expect(rfidLectorListo({ catalogoResuelto: true, lectores: 2, lectorId: 24 })).toBe(true);
    expect(rfidLectorListo({ catalogoResuelto: true, lectores: 2, lectorId: null })).toBe(false);
  });
  test("un catálogo que respondió sin lista (falló o sin endpoint) lee de todos, como antes", () => {
    expect(rfidLectorListo({ catalogoResuelto: true, lectores: 0, lectorId: null })).toBe(true);
  });
});

test.describe("llave del cursor por montaje (EC-997)", () => {
  /** Lo que hace `useRfidCursorScans` con TanStack: misma forma de opciones, sin React. */
  const mountFeed = (client: QueryClient, mount: number, queryFn: () => Promise<{ fresh: number }>) => {
    const observer = new QueryObserver(client, {
      queryKey: rfidCursorScansKey(true, 9, mount, 0),
      queryFn,
      gcTime: 0,
      staleTime: 15 * 60 * 1000,
      retry: false,
    });
    return observer.subscribe(() => {});
  };

  test("Detener → Iniciar con un sondeo en vuelo: el montaje nuevo arranca de inmediato y no lo hereda", async () => {
    const client = new QueryClient();
    let release: (v: { fresh: number }) => void = () => {};
    const calls: string[] = [];
    const first = nextCursorFeedMount();
    const unmountFirst = mountFeed(client, first, () => {
      calls.push("primero");
      return new Promise((resolve) => (release = resolve));
    });
    unmountFirst();
    const second = nextCursorFeedMount();
    expect(second).not.toBe(first);
    const unmountSecond = mountFeed(client, second, async () => {
      calls.push("segundo");
      return { fresh: 0 };
    });
    await flush();
    expect(calls).toEqual(["primero", "segundo"]);

    // La consulta del primero se va de la caché al terminar su sondeo: nada se acumula.
    release({ fresh: 3 });
    await flush();
    await new Promise((resolve) => setTimeout(resolve, 5));
    expect(client.getQueryCache().find({ queryKey: rfidCursorScansKey(true, 9, first, 0) })).toBeUndefined();
    unmountSecond();
    await new Promise((resolve) => setTimeout(resolve, 5));
    expect(client.getQueryCache().getAll()).toHaveLength(0);
  });
  test("con la llave de antes (sin montaje) el nuevo heredaba el sondeo en vuelo", async () => {
    const client = new QueryClient();
    const calls: string[] = [];
    const sameKey = () =>
      new QueryObserver(client, {
        queryKey: ["rfid-scans", "cursor", true, 9, 0],
        queryFn: () => {
          calls.push("sondeo");
          return new Promise<{ fresh: number }>(() => {});
        },
        gcTime: 0,
        staleTime: 15 * 60 * 1000,
      }).subscribe(() => {});
    sameKey()();
    sameKey();
    await flush();
    expect(calls).toEqual(["sondeo"]);
  });
});

test.describe("EPC ya leído en otro encuadre de la misma orden (#1453)", () => {
  test("es un rechazo con el mensaje del backend, sin detener la cola", async () => {
    const message = "Esta pieza ya se leyó en el encuadre 8 de la misma orden.";
    const classified = classifyReadError(axiosError(400, { epc: message }));
    expect(classified).toEqual({ kind: "duplicate", message });
    expect(readErrorFeedback(classified.kind, classified.message)).toEqual({ tone: "warn", title: "Ya leído", detail: message });

    const { core, calls } = makeQueue((epc) =>
      epc === "E1" ? Promise.reject(axiosError(400, { epc: message })) : Promise.resolve(savedRead(epc)),
    );
    core.enqueue("E1");
    core.enqueue("E2");
    await flush();
    expect(calls.sent).toEqual(["E1", "E2"]);
    expect(core.isStopped).toBe(false);
  });
});

test.describe("pausar a mitad de un sondeo con cursor no pierde lecturas", () => {
  test("lo que trae un sondeo en vuelo llega a la bandeja aunque se pause entre páginas", async () => {
    const rows = Array.from({ length: 450 }, (_, i) => ({ id: 1001 + i, epc: `E${1001 + i}` }));
    const outbox = new ScanOutbox<{ id: number; epc: string }>();
    let paused = false;
    const fetchPage = async (cursor: number | null) => {
      // El operador pausa mientras se piden las páginas 2 y 3.
      if (cursor !== null && cursor > 1000) paused = true;
      return rows.filter((r) => r.id > (cursor ?? 0)).slice(0, 200);
    };
    const result = await drainFeedAfterCursor(1000, fetchPage);
    outbox.push(result.fresh);
    expect(paused).toBe(true);
    // La entrega no depende de la pausa: todo, en orden, una sola vez.
    const delivered = outbox.take();
    expect(delivered.map((r) => r.id)).toEqual(rows.map((r) => r.id));
    expect(outbox.take()).toEqual([]);
    expect(result.cursor).toBe(1450);
  });
  test("la bandeja acumula varios sondeos en orden hasta que se vacía", () => {
    const outbox = new ScanOutbox<number>();
    outbox.push([1, 2]);
    outbox.push([3]);
    expect(outbox.take()).toEqual([1, 2, 3]);
  });
});

test.describe("totales y rechazadas de la sesión", () => {
  test("cada resultado suma en su total", () => {
    const tally = [
      { kind: "enviada", sinAsignar: false },
      { kind: "enviada", sinAsignar: true },
      { kind: "ya-leida" },
      { kind: "rechazada", code: "E1", message: "x" },
    ].reduce((acc, outcome) => tallyRead(acc, outcome as RfidReadOutcome), EMPTY_READ_TALLY);
    expect(tally).toEqual({ enviadas: 2, sinAsignar: 1, yaLeidas: 1, rechazadas: 1 });
  });
  test("la cola reporta cada lectura con su resultado y el mensaje del backend al rechazar", async () => {
    const cross = "Esta pieza ya se leyó en el encuadre 14 de la misma orden.";
    const { core, calls } = makeQueue((epc) =>
      epc === "E2"
        ? Promise.reject(axiosError(400, { epc: cross }))
        : Promise.resolve({ ...savedRead(epc), orden_produccion_detalle: epc === "E3" ? null : 19 }),
    );
    core.setKnown(new Set(["E9"]));
    core.enqueue("E1");
    core.enqueue("E2");
    core.enqueue("E3");
    core.enqueue("E9");
    await flush();
    expect(calls.outcomes).toEqual([
      { kind: "ya-leida" },
      { kind: "enviada", sinAsignar: false },
      { kind: "rechazada", code: "E2", message: cross },
      { kind: "enviada", sinAsignar: true },
    ]);
  });
  test("los totales siguen contando más allá de las 50 filas de la lista", async () => {
    const { core, calls } = makeQueue((epc) => Promise.resolve(savedRead(epc)));
    for (let i = 0; i < 60; i += 1) core.enqueue(`E${i}`);
    await flush();
    const tally = calls.outcomes.reduce(tallyRead, EMPTY_READ_TALLY);
    expect(tally.enviadas).toBe(60);
  });
  test("lo descartado al detenerse la cola también queda como no registrado", async () => {
    const { core, calls } = makeQueue(() =>
      Promise.reject(axiosError(400, { estatus: "Solo se puede escanear un encuadre pendiente." })),
    );
    core.enqueue("E1");
    core.enqueue("E2");
    await flush();
    expect(calls.outcomes.map((o) => o.kind)).toEqual(["rechazada", "rechazada"]);
    expect(calls.outcomes[1]).toMatchObject({ code: "E2", message: "No se envió: Solo se puede escanear un encuadre pendiente." });
  });
});

test.describe("estado de la lectura en el detalle", () => {
  test("la cola detenida apaga la lectura (Aceptar deja de pedir pausa)", () => {
    expect(nextCaptureState(true, "queue-stopped")).toEqual({ reading: false, refreshList: true });
    expect(acceptAvailability({ estatus: "PENDIENTE", reading: false, pendingReads: 0 }).allowed).toBe(true);
  });
  test("abrir Cancelar apaga la lectura", () => {
    expect(nextCaptureState(true, "cancel-opened")).toEqual({ reading: false, refreshList: true });
    expect(nextCaptureState(false, "cancel-opened")).toEqual({ reading: false, refreshList: false });
  });
  test("encender, pausar y cerrar", () => {
    expect(nextCaptureState(false, "start")).toEqual({ reading: true, refreshList: false });
    expect(nextCaptureState(true, "pause")).toEqual({ reading: false, refreshList: true });
    expect(nextCaptureState(false, "dialog-closed")).toEqual({ reading: false, refreshList: true });
  });
  test("un sondeo en vuelo tras pausar mantiene Aceptar bloqueado", () => {
    // El panel reporta lecturas pendientes + 1 por el sondeo en vuelo.
    expect(acceptAvailability({ estatus: "PENDIENTE", reading: false, pendingReads: 0 + 1 })).toEqual({
      allowed: false,
      reason: "Espera a que terminen de enviarse las lecturas.",
    });
  });
});
