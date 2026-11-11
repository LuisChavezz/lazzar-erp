import { expect, test } from "@playwright/test";
import { AxiosError, AxiosHeaders, type AxiosResponse } from "axios";
import { ZodError } from "zod";
import { v1_api } from "@/src/api/v1.api";
import { resolveDocumentAuditTarget } from "@/src/features/document-audit/constants/documentAuditOpeners";
import { getTipoDocumentoLabel } from "@/src/features/document-audit/constants/documentAuditValues";
import type { BitacoraDocumento } from "@/src/features/document-audit/interfaces/document-audit.interface";
import { getDocumentTimeline } from "@/src/features/document-audit/services/actions";
import { DEFAULT_QUERY_RETRY } from "@/src/constants/queryCache";
import {
  documentAuditErrorMessage,
  retryDocumentAuditQuery,
} from "@/src/features/document-audit/utils/documentAuditErrors";
import {
  canRefreshOrderHistory,
  resolveOrderHistoryView,
  type OrderHistoryQuery,
} from "@/src/features/orders/utils/orderHistoryView";

/**
 * EC-862: `linea-tiempo` responde `{eventos, truncado}` desde nucleo-erp PR
 * #1072 (antes un arreglo), con los 500 eventos MÁS RECIENTES, y 404 si el
 * documento no es de la empresa. Se prueba la petición, el estado que pinta la
 * hoja "Historial" (`resolveOrderHistoryView`) y los mensajes de error.
 * Corren con `npm run test:unit`.
 */

const httpError = (status: number, data: unknown): AxiosError => {
  const config = { headers: new AxiosHeaders() };
  const response = { status, statusText: "", headers: {}, config, data } as AxiosResponse;
  return new AxiosError("Request failed", String(status), config, undefined, response);
};

const evento = (overrides: Partial<BitacoraDocumento> = {}): BitacoraDocumento => ({
  id: 1,
  created_at: "2026-11-11T18:00:00Z",
  tipo_documento: "pedido",
  documento_id: "7",
  folio: "PED-7",
  accion: "estatus",
  accion_display: "Cambio de estatus",
  estatus_anterior: "Por autorizar",
  estatus_nuevo: "Autorizado",
  estatus_codigo: "AUTORIZADO",
  total: null,
  moneda_id: null,
  sucursal_id: 1,
  origen_tipo: "",
  origen_id: null,
  usuario_id: 3,
  usuario_nombre: "Ana López",
  ...overrides,
});

const history = (overrides: Partial<OrderHistoryQuery>): OrderHistoryQuery => ({
  events: undefined,
  isTruncated: false,
  isLoading: false,
  isFetching: false,
  isInitialError: false,
  isDefinitiveError: false,
  error: null,
  refetch: () => undefined,
  ...overrides,
});

const quinientos = Array.from({ length: 500 }, (_, i) => evento({ id: i + 1 }));

test.describe("getDocumentTimeline", () => {
  test("devuelve el objeto {eventos, truncado} y manda tipo y documento_id", async () => {
    const originalGet = v1_api.get;
    const calls: { url: string; params: unknown }[] = [];
    const body = { eventos: [evento()], truncado: true };
    v1_api.get = (async (url: string, config?: { params?: unknown }) => {
      calls.push({ url, params: config?.params });
      return { data: body };
    }) as typeof v1_api.get;
    try {
      await expect(getDocumentTimeline("pedido", 7)).resolves.toEqual(body);
      expect(calls).toEqual([
        { url: "/auditoria/documentos/linea-tiempo/", params: { tipo: "pedido", documento_id: 7 } },
      ]);
    } finally {
      v1_api.get = originalGet;
    }
  });

  test("otra forma de respuesta es un error, no 'sin eventos'", async () => {
    const originalGet = v1_api.get;
    try {
      for (const data of [[evento()], {}, { eventos: [evento()] }, { eventos: "x", truncado: false }]) {
        v1_api.get = (async () => ({ data })) as typeof v1_api.get;
        const error = await getDocumentTimeline("pedido", 7).catch((e: unknown) => e);
        expect(error).toBeInstanceOf(ZodError);
        // El texto técnico de zod nunca llega a la hoja.
        expect(documentAuditErrorMessage(error, "Respaldo")).toBe("Respaldo");
      }
    } finally {
      v1_api.get = originalGet;
    }
  });
});

test.describe("resolveOrderHistoryView", () => {
  test("con eventos los entrega tal cual, sin aviso", () => {
    const events = [evento(), evento({ id: 2, tipo_documento: "cobro", folio: "COB-9" })];
    expect(resolveOrderHistoryView(history({ events }))).toEqual({
      kind: "events",
      events,
      truncationNotice: null,
    });
  });

  test("con truncado avisa que faltan los eventos más antiguos", () => {
    const view = resolveOrderHistoryView(history({ events: quinientos, isTruncated: true }));
    expect(view).toMatchObject({
      kind: "events",
      truncationNotice:
        "Se muestran los 500 eventos más recientes; los anteriores no se incluyen en este historial.",
    });
  });

  test("sin truncado no avisa, aunque haya 500 eventos", () => {
    const view = resolveOrderHistoryView(history({ events: quinientos, isTruncated: false }));
    expect(view).toMatchObject({ kind: "events", truncationNotice: null });
  });

  test("un 404 es 'no disponible' y gana a carga y error", () => {
    const notFound = httpError(404, { detail: "Documento no encontrado." });
    expect(resolveOrderHistoryView(history({ isDefinitiveError: true, error: notFound }))).toEqual({
      kind: "unavailable",
    });
    expect(
      resolveOrderHistoryView(history({ isDefinitiveError: true, isLoading: true, isInitialError: true })),
    ).toEqual({ kind: "unavailable" });
  });

  test("cargando, vacío y error de carga", () => {
    expect(resolveOrderHistoryView(history({ isLoading: true }))).toEqual({ kind: "loading" });
    expect(resolveOrderHistoryView(history({ events: [] }))).toEqual({ kind: "empty", loaded: true });
    // Consulta apagada (p. ej. pedido cancelado): vacío, pero sin respuesta.
    expect(resolveOrderHistoryView(history({}))).toEqual({ kind: "empty", loaded: false });
    expect(
      resolveOrderHistoryView(
        history({ isInitialError: true, error: httpError(400, { documento_id: "Debe ser un número entero." }) }),
      ),
    ).toEqual({ kind: "error", message: "Documento: Debe ser un número entero." });
    expect(
      resolveOrderHistoryView(history({ isInitialError: true, error: httpError(500, "<html>") })),
    ).toEqual({ kind: "error", message: "No se pudo cargar el historial del pedido." });
  });
});

test.describe("canRefreshOrderHistory", () => {
  test("solo con una respuesta ya cargada", () => {
    const can = (overrides: Partial<OrderHistoryQuery>) =>
      canRefreshOrderHistory(resolveOrderHistoryView(history(overrides)));
    expect(can({ events: [evento()] })).toBe(true);
    expect(can({ events: [evento()], isFetching: true })).toBe(true);
    expect(can({ events: [] })).toBe(true);
    expect(can({})).toBe(false);
    expect(can({ isLoading: true })).toBe(false);
    expect(can({ isInitialError: true })).toBe(false);
    expect(can({ isDefinitiveError: true })).toBe(false);
  });
});

test.describe("derivados nuevos de linea-tiempo", () => {
  test("factura de proveedor, transferencia y cobro tienen etiqueta", () => {
    expect(getTipoDocumentoLabel("factura_proveedor")).toBe("Factura de proveedor");
    expect(getTipoDocumentoLabel("transferencia")).toBe("Transferencia");
    expect(getTipoDocumentoLabel("cobro")).toBe("Cobro");
  });

  test("factura de proveedor y cobro quedan como texto, sin enlace", () => {
    const admin = { role: "admin", permissions: [] } as never;
    for (const tipo of ["factura_proveedor", "cobro"]) {
      expect(resolveDocumentAuditTarget({ tipo_documento: tipo, documento_id: "5", accion: "crear" }, admin)).toBeNull();
    }
  });
});

test.describe("retryDocumentAuditQuery", () => {
  test("no reintenta un 400 ni una respuesta con otra forma", () => {
    expect(retryDocumentAuditQuery(0, httpError(400, { usuario: "x" }))).toBe(false);
    expect(retryDocumentAuditQuery(0, new ZodError([]))).toBe(false);
  });

  test("401, 403, 404, 408, 429, 5xx y red siguen la política global", () => {
    for (const status of [401, 403, 404, 408, 429, 500, 503]) {
      expect(retryDocumentAuditQuery(0, httpError(status, {}))).toBe(true);
      expect(retryDocumentAuditQuery(DEFAULT_QUERY_RETRY, httpError(status, {}))).toBe(false);
    }
    expect(retryDocumentAuditQuery(0, new AxiosError("Network Error"))).toBe(true);
  });
});

test.describe("documentAuditErrorMessage", () => {
  test("un 400 de parámetro dice qué filtro rechazó", () => {
    expect(documentAuditErrorMessage(httpError(400, { usuario: "Debe ser un número entero." }), "x")).toBe(
      "Usuario: Debe ser un número entero.",
    );
    expect(
      documentAuditErrorMessage(httpError(400, { fecha_desde: ["Usa el formato YYYY-MM-DD."] }), "x"),
    ).toBe("Fecha desde: Usa el formato YYYY-MM-DD.");
  });

  test("otro 400 o un 403 muestran el mensaje del backend", () => {
    expect(documentAuditErrorMessage(httpError(400, { non_field_errors: ["Rango inválido."] }), "R")).toBe(
      "Rango inválido.",
    );
    expect(documentAuditErrorMessage(httpError(400, { detail: "Petición inválida." }), "R")).toBe(
      "Petición inválida.",
    );
    expect(documentAuditErrorMessage(httpError(400, { otro: "nada" }), "R")).toBe("nada");
    expect(
      documentAuditErrorMessage(
        httpError(403, { detail: "No tienes permiso para consultar la bitácora de documentos." }),
        "R",
      ),
    ).toBe("No tienes permiso para consultar la bitácora de documentos.");
  });

  test("lo demás cae al respaldo", () => {
    expect(documentAuditErrorMessage(httpError(400, {}), "Respaldo")).toBe("Respaldo");
    expect(documentAuditErrorMessage(httpError(403, {}), "Respaldo")).toBe("Respaldo");
    expect(documentAuditErrorMessage(httpError(500, "<html>"), "Respaldo")).toBe("Respaldo");
    expect(documentAuditErrorMessage(httpError(404, { detail: "No." }), "Respaldo")).toBe("Respaldo");
  });
});
