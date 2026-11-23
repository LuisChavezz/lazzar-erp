import { expect, test } from "@playwright/test";
import { QueryClient } from "@tanstack/react-query";
import {
  mergeCachedRecord,
  patchCachedRowById,
  patchRowById,
  pickPresentFields,
  replaceCachedRow,
  resultRecordId,
} from "@/src/utils/cachedRows";
import {
  attendanceParamsInclude,
  isAttendanceRecord,
  upsertAttendanceRow,
} from "@/src/features/attendance/utils/attendanceCache";
import { writePurchaseOrderStatus } from "@/src/features/purchase-orders/utils/purchaseOrderStatusCache";
import type { Attendance } from "@/src/features/attendance/interfaces/attendance.interface";
import { applySubmittedQuoteToCache } from "@/src/features/quotes/hooks/submittedQuoteCache";
import type { Quote, QuoteSubmitForReviewResponse } from "@/src/features/quotes/interfaces/quote.interface";
import type { QuoteBoard, QuoteListResponse } from "@/src/features/quotes/interfaces/quote-list.interface";
import { findQuoteOutsideColumn } from "@/src/features/quotes/utils/quoteBoardCache";

/**
 * EC-927: las acciones que cambian el estatus de un registro escriben su
 * resultado en la caché ANTES de invalidar, para que un refetch fallido no deje
 * la fila con el estatus viejo y la acción disponible. Corren con
 * `npm run test:unit`.
 */

interface Row {
  id: number;
  estado: string;
  otro?: string;
}

const pageOf = <T>(results: T[]) => ({ count: results.length, next: null, previous: null, results });

test.describe("patchRowById", () => {
  test("arreglo plano: reemplaza solo la fila con ese id", () => {
    const rows: Row[] = [
      { id: 1, estado: "pendiente" },
      { id: 2, estado: "pendiente" },
    ];
    const next = patchRowById<Row>(rows, 2, (row) => ({ ...row, estado: "aprobada" })) as Row[];
    expect(next).toEqual([
      { id: 1, estado: "pendiente" },
      { id: 2, estado: "aprobada" },
    ]);
    expect(next[0]).toBe(rows[0]);
    expect(rows[1].estado).toBe("pendiente");
  });

  test("página DRF: parchea `results` y conserva las demás claves", () => {
    const data = pageOf<Row>([{ id: 7, estado: "1", otro: "x" }]);
    const next = patchRowById<Row>(data, 7, (row) => ({ ...row, estado: "6" }));
    expect(next).toEqual({ count: 1, next: null, previous: null, results: [{ id: 7, estado: "6", otro: "x" }] });
    expect(data.results[0].estado).toBe("1");
  });

  test("sin la fila, u otra forma: misma referencia", () => {
    const rows: Row[] = [{ id: 1, estado: "pendiente" }];
    expect(patchRowById<Row>(rows, 99, (row) => row)).toBe(rows);
    const detail = { id: 1, estado: "pendiente" };
    expect(patchRowById<Row>(detail, 1, (row) => row)).toBe(detail);
    const board = { columnas: [] };
    expect(patchRowById<Row>(board, 1, (row) => row)).toBe(board);
    expect(patchRowById<Row>(undefined, 1, (row) => row)).toBeUndefined();
  });
});

test.describe("patchCachedRowById", () => {
  test("escribe cada variante que tiene la fila y no toca las demás", async () => {
    const queryClient = new QueryClient();
    const q1 = ["payroll", { periodo_inicio__gte: "2026-11-01" }];
    const q2 = ["payroll", { periodo_inicio__gte: "2026-11-16" }];
    const otro = ["payroll", { periodo_inicio__gte: "2026-10-16" }];
    queryClient.setQueryData(q1, [{ id: 5, estado: "pendiente" }]);
    queryClient.setQueryData(q2, [{ id: 5, estado: "pendiente" }, { id: 6, estado: "pendiente" }]);
    const untouched = [{ id: 9, estado: "pendiente" }];
    queryClient.setQueryData(otro, untouched);
    const untouchedAt = queryClient.getQueryState(otro)?.dataUpdatedAt;

    await patchCachedRowById<Row>(queryClient, ["payroll"], 5, (row) => ({ ...row, estado: "pagada" }));

    expect(queryClient.getQueryData(q1)).toEqual([{ id: 5, estado: "pagada" }]);
    expect(queryClient.getQueryData(q2)).toEqual([
      { id: 5, estado: "pagada" },
      { id: 6, estado: "pendiente" },
    ]);
    expect(queryClient.getQueryData(otro)).toBe(untouched);
    expect(queryClient.getQueryState(otro)?.dataUpdatedAt).toBe(untouchedAt);
  });

  test("lista en modo servidor: solo bajo el prefijo `list`, con los campos que da el parche", async () => {
    const queryClient = new QueryClient();
    const list = ["purchase-orders", "list", { limit: 20, offset: 0 }];
    const detail = ["purchase-orders", 3];
    queryClient.setQueryData(list, pageOf([{ id: 3, estatus: 2, folio: null, total: "100.00" }]));
    const detailData = { id: 3, estatus: 2 };
    queryClient.setQueryData(detail, detailData);

    await patchCachedRowById<{ id: number; estatus: number; folio: string | null }>(
      queryClient,
      ["purchase-orders", "list"],
      3,
      (row) => ({ ...row, estatus: 3, folio: "OC-1-9" }),
    );

    expect(queryClient.getQueryData(list)).toEqual(
      pageOf([{ id: 3, estatus: 3, folio: "OC-1-9", total: "100.00" }]),
    );
    expect(queryClient.getQueryData(detail)).toBe(detailData);
  });
});

test.describe("asistencia: escribir la falta en los listados", () => {
  const falta = { id: 40, empleado: 8, fecha: "2026-11-20", estado: "falta" } as unknown as Attendance;

  test("el filtro de fecha decide qué listados la incluyen", () => {
    expect(attendanceParamsInclude({ fecha: "2026-11-20" }, falta.fecha)).toBe(true);
    expect(attendanceParamsInclude({ fecha: "2026-11-21" }, falta.fecha)).toBe(false);
    expect(attendanceParamsInclude({ fecha__gte: "2026-11-16", fecha__lte: "2026-11-30" }, falta.fecha)).toBe(true);
    expect(attendanceParamsInclude({ fecha__gte: "2026-11-20", fecha__lte: "2026-11-20" }, falta.fecha)).toBe(true);
    expect(attendanceParamsInclude({ fecha__gte: "2026-11-01", fecha__lte: "2026-11-15" }, falta.fecha)).toBe(false);
    expect(attendanceParamsInclude({}, falta.fecha)).toBe(false);
    expect(attendanceParamsInclude(undefined, falta.fecha)).toBe(false);
  });

  test("inserta en orden `-fecha`, o reemplaza si ya está", () => {
    const a = { id: 1, fecha: "2026-11-21" } as Attendance;
    const b = { id: 2, fecha: "2026-11-19" } as Attendance;
    expect(upsertAttendanceRow([a, b], falta)).toEqual([a, falta, b]);
    expect(upsertAttendanceRow([], falta)).toEqual([falta]);
    expect(upsertAttendanceRow([a], falta)).toEqual([a, falta]);
    const stale = { ...falta, estado: "puntual" } as Attendance;
    expect(upsertAttendanceRow([a, stale], falta)).toEqual([a, falta]);
    expect(upsertAttendanceRow(undefined, falta)).toBeUndefined();
  });
});

test.describe("enviar cotización a revisión: lista y tablero", () => {
  const quote = (id: number, estatus: number, createdAt: string, label = String(estatus)): Quote =>
    ({ id, estatus, estatus_label: label, created_at: createdAt, updated_at: "viejo" }) as unknown as Quote;

  const response = (id: number): QuoteSubmitForReviewResponse => ({
    ok: true,
    estatus: "EN REVISION",
    cotizacion: { id, estatus: 2, motivo_rechazo: null, updated_at: "nuevo" },
  });

  const board = (columns: { estatus: number; total: number; results: Quote[] }[]): QuoteBoard => ({
    por_columna: 20,
    columnas: columns.map((column) => ({ ...column, estatus_label: String(column.estatus) })),
  });

  test("findQuoteOutsideColumn busca en el tablero y en los 'cargar más', fuera del destino", () => {
    const q = quote(10, 1, "2026-11-01T00:00:00Z");
    const tablero = board([
      { estatus: 1, total: 1, results: [q] },
      { estatus: 2, total: 0, results: [] },
    ]);
    expect(findQuoteOutsideColumn(tablero, [], 10, 2)).toEqual({ quote: q, sourceEstatus: 1 });
    expect(findQuoteOutsideColumn(tablero, [], 10, 1)).toBeNull();
    const enPagina = quote(11, 4, "2026-10-01T00:00:00Z");
    expect(
      findQuoteOutsideColumn(tablero, [{ estatus: 4, pages: [pageOf([enPagina])] }], 11, 2),
    ).toEqual({ quote: enPagina, sourceEstatus: 4 });
  });

  test("lista y recientes: estatus, etiqueta del catálogo y `updated_at`; nada más", async () => {
    const queryClient = new QueryClient();
    const list = ["quotes", "list", { limit: 20, offset: 0 }];
    const recent = ["quotes", "recientes"];
    const kpis = ["quotes", "kpis", {}];
    const row = { ...quote(10, 1, "2026-11-01T00:00:00Z", "Borrador"), cliente_nombre: "ACME" };
    queryClient.setQueryData(list, pageOf([row]));
    queryClient.setQueryData(recent, pageOf([row]));
    const kpisData = { total: 1, por_estatus: [] };
    queryClient.setQueryData(kpis, kpisData);

    await applySubmittedQuoteToCache(queryClient, response(10));

    const expected = pageOf([{ ...row, estatus: 2, estatus_label: "Por Autorizar", updated_at: "nuevo" }]);
    expect(queryClient.getQueryData(list)).toEqual(expected);
    expect(queryClient.getQueryData(recent)).toEqual(expected);
    expect(queryClient.getQueryData(kpis)).toBe(kpisData);
  });

  test("tablero: la tarjeta pasa a Por Autorizar con los conteos y sale de los 'cargar más'", async () => {
    const queryClient = new QueryClient();
    const params = { q: "acme" };
    const boardKey = ["quotes", "tablero", params];
    const moreKey = ["quotes", "tablero-columna", params, 1, 1];
    const otherParamsMore = ["quotes", "tablero-columna", {}, 1, 1];
    const a = quote(10, 1, "2026-11-01T00:00:00Z");
    const b = quote(11, 1, "2026-10-01T00:00:00Z");
    queryClient.setQueryData(
      boardKey,
      board([
        { estatus: 1, total: 3, results: [a] },
        { estatus: 2, total: 0, results: [] },
      ]),
    );
    queryClient.setQueryData(moreKey, [pageOf([b])]);
    const ajena = [pageOf([b])];
    queryClient.setQueryData(otherParamsMore, ajena);

    await applySubmittedQuoteToCache(queryClient, response(11));

    const after = queryClient.getQueryData<QuoteBoard>(boardKey)!;
    expect(after.columnas[0]).toMatchObject({ estatus: 1, total: 2, results: [a] });
    expect(after.columnas[1].total).toBe(1);
    expect(after.columnas[1].results).toEqual([
      { ...b, estatus: 2, estatus_label: "Por Autorizar", updated_at: "nuevo" },
    ]);
    expect(queryClient.getQueryData<QuoteListResponse[]>(moreKey)![0].results).toEqual([]);
    expect(queryClient.getQueryData(otherParamsMore)).toBe(ajena);
  });

  test("tablero ya movido por el arrastre: no la mueve dos veces", async () => {
    const queryClient = new QueryClient();
    const boardKey = ["quotes", "tablero", {}];
    const moved = quote(10, 2, "2026-11-01T00:00:00Z", "Por Autorizar");
    const data = board([
      { estatus: 1, total: 0, results: [] },
      { estatus: 2, total: 1, results: [moved] },
    ]);
    queryClient.setQueryData(boardKey, data);

    await applySubmittedQuoteToCache(queryClient, response(10));

    expect(queryClient.getQueryData(boardKey)).toBe(data);
  });
});

/**
 * Respuesta con otra forma (otro backend desplegado): la escritura en caché es
 * best-effort. No lanza ni escribe nada, para que el `onSuccess` siga con su
 * toast y sus invalidaciones (un error volvería "fallida" una acción aplicada).
 */
test.describe("respuesta con otra forma: no escribe ni lanza", () => {
  test("id y campos: solo lo que la respuesta trae", () => {
    expect(resultRecordId({ id: 4 })).toBe(4);
    for (const bad of [undefined, null, "4", [4], { id: "4" }, { id: 0 }, { id: 1.5 }, {}]) {
      expect(resultRecordId(bad)).toBeNull();
    }
    expect(pickPresentFields<Row>({ id: 1, estado: "x", sobra: 1 }, ["estado", "otro"])).toEqual({
      estado: "x",
    });
    expect(pickPresentFields<Row>(undefined, ["estado"])).toEqual({});
  });

  test("patchCachedRowById ignora un id inválido y no lanza aunque el parche falle", async () => {
    const queryClient = new QueryClient();
    const rows = [{ id: 1, estado: "pendiente" }];
    queryClient.setQueryData(["absences"], rows);
    await patchCachedRowById<Row>(queryClient, ["absences"], undefined, (row) => ({ ...row, estado: "x" }));
    expect(queryClient.getQueryData(["absences"])).toBe(rows);
    await expect(
      patchCachedRowById<Row>(queryClient, ["absences"], 1, () => {
        throw new TypeError("forma inesperada");
      }),
    ).resolves.toBeUndefined();
    expect(queryClient.getQueryData(["absences"])).toBe(rows);
  });

  test("replaceCachedRow: sin `estado` o sin id no reemplaza la fila", async () => {
    const queryClient = new QueryClient();
    const rows = [{ id: 1, estado: "pendiente" }];
    queryClient.setQueryData(["vacations"], rows);
    for (const response of [undefined, { ok: true }, { id: 1 }, { estado: "aprobada" }]) {
      await replaceCachedRow<Row>(queryClient, ["vacations"], response, ["estado"]);
    }
    expect(queryClient.getQueryData(["vacations"])).toBe(rows);
    await replaceCachedRow<Row>(queryClient, ["vacations"], { id: 1, estado: "aprobada" }, ["estado"]);
    expect(queryClient.getQueryData(["vacations"])).toEqual([{ id: 1, estado: "aprobada" }]);
  });

  test("mergeCachedRecord: solo el detalle del mismo registro", async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(["purchase-orders", 3], { id: 3, estatus: 2, total: "10.00" });
    await mergeCachedRecord(queryClient, ["purchase-orders", 3], 3, { estatus: 3 });
    expect(queryClient.getQueryData(["purchase-orders", 3])).toEqual({ id: 3, estatus: 3, total: "10.00" });
    await mergeCachedRecord(queryClient, ["purchase-orders", 9], 9, { estatus: 3 });
    expect(queryClient.getQueryData(["purchase-orders", 9])).toBeUndefined();
  });

  test("asistencia: el alta sin id, fecha ISO o estado no es un registro", () => {
    expect(isAttendanceRecord({ id: 1, fecha: "2026-11-20", estado: "falta" })).toBe(true);
    for (const bad of [
      undefined,
      {},
      { id: 1, fecha: "20/11/2026", estado: "falta" },
      { id: 1, fecha: "2026-11-20" },
    ]) {
      expect(isAttendanceRecord(bad)).toBe(false);
    }
  });
});

test.describe("OC: estatus en listado y detalle, nunca importes", () => {
  const listKey = ["purchase-orders", "list", { limit: 20, offset: 0, estatus: "2" }];
  const detailKey = ["purchase-orders", 3];
  const seed = () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(
      listKey,
      pageOf([{ id: 3, estatus: 2, estatus_label: "Pendiente a confirmar", folio: null, piezas_recibidas: 5 }]),
    );
    queryClient.setQueryData(detailKey, { id: 3, estatus: 2, estatus_label: "Pendiente a confirmar", folio: null });
    return queryClient;
  };

  test("confirmar: estatus, etiqueta, folio y fecha; ni importes ni el progreso en null", async () => {
    const queryClient = seed();
    await writePurchaseOrderStatus(
      queryClient,
      {
        id: 3,
        estatus: 3,
        estatus_label: "Autorizada",
        folio: "OC-1-9",
        fecha_autorizacion: "2026-11-23T10:00:00Z",
        gran_total: "999.00",
        piezas_recibidas: null,
      },
      ["estatus", "estatus_label", "folio", "fecha_autorizacion"],
    );
    const expected = {
      id: 3,
      estatus: 3,
      estatus_label: "Autorizada",
      folio: "OC-1-9",
      fecha_autorizacion: "2026-11-23T10:00:00Z",
    };
    // La fila sigue en la variante filtrada por `estatus=2` (excepción documentada en CLAUDE.md).
    expect(queryClient.getQueryData(listKey)).toEqual(pageOf([{ ...expected, piezas_recibidas: 5 }]));
    expect(queryClient.getQueryData(detailKey)).toEqual(expected);
  });

  test("sin `estatus_label` en la respuesta, se deriva de la tabla local", async () => {
    const queryClient = seed();
    await writePurchaseOrderStatus(queryClient, { id: 3, estatus: 6 }, ["estatus", "estatus_label"]);
    const row = (queryClient.getQueryData(listKey) as { results: { estatus_label: string }[] }).results[0];
    expect(row.estatus_label).toBeTruthy();
    expect(row.estatus_label).not.toBe("Pendiente a confirmar");
  });

  test("respuesta sin `orden_compra` o sin estatus: no escribe nada", async () => {
    const queryClient = seed();
    const list = queryClient.getQueryData(listKey);
    const detail = queryClient.getQueryData(detailKey);
    for (const record of [undefined, { id: 3 }, { id: 3, estatus: "3" }, { estatus: 3 }]) {
      await writePurchaseOrderStatus(queryClient, record, ["estatus", "folio"]);
    }
    expect(queryClient.getQueryData(listKey)).toBe(list);
    expect(queryClient.getQueryData(detailKey)).toBe(detail);
  });
});

test.describe("cotización enviada: respuesta con otra forma y detalle", () => {
  test("sin `cotizacion` o sin estatus numérico: no escribe ni lanza", async () => {
    const queryClient = new QueryClient();
    const list = pageOf([{ id: 10, estatus: 1, estatus_label: "Borrador" }]);
    queryClient.setQueryData(["quotes", "list", {}], list);
    for (const response of [
      undefined,
      { ok: true, estatus: "EN REVISION" },
      { ok: true, estatus: "EN REVISION", cotizacion: { id: 10, estatus: "2" } },
    ]) {
      await applySubmittedQuoteToCache(queryClient, response as unknown as QuoteSubmitForReviewResponse);
    }
    expect(queryClient.getQueryData(["quotes", "list", {}])).toBe(list);
  });

  test("el detalle `{ data, resource }` recibe estatus, etiqueta y `updated_at`", async () => {
    const queryClient = new QueryClient();
    const key = ["quote", 10, "cotizaciones"];
    queryClient.setQueryData(key, {
      data: { id: 10, estatus: 4, estatus_label: "Rechazada", updated_at: "viejo", gran_total: "5.00" },
      resource: "cotizaciones",
    });
    const otra = { data: { id: 11, estatus: 4 }, resource: "cotizaciones" };
    queryClient.setQueryData(["quote", 11, "cotizaciones"], otra);
    await applySubmittedQuoteToCache(queryClient, {
      ok: true,
      estatus: "EN REVISION",
      cotizacion: { id: 10, estatus: 2, motivo_rechazo: null, updated_at: "nuevo" },
    });
    expect(queryClient.getQueryData(key)).toEqual({
      data: { id: 10, estatus: 2, estatus_label: "Por Autorizar", updated_at: "nuevo", gran_total: "5.00" },
      resource: "cotizaciones",
    });
    expect(queryClient.getQueryData(["quote", 11, "cotizaciones"])).toBe(otra);
  });
});
