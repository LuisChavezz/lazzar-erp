import { expect, test } from "@playwright/test";
import { QueryClient, QueryClientProvider, type Query } from "@tanstack/react-query";
import { AxiosError, AxiosHeaders, type AxiosResponse } from "axios";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { useDocumentTimeline } from "@/src/features/document-audit/hooks/useDocumentTimeline";
import { DOCUMENT_AUDIT_QUERY_KEY } from "@/src/features/document-audit/hooks/useDocumentAuditList";
import type { BitacoraLineaTiempo } from "@/src/features/document-audit/interfaces/document-audit.interface";

/**
 * EC-862: `useDocumentTimeline` es lo que arregla el crash de la hoja
 * "Historial" (nucleo-erp PR #1072 cambió `linea-tiempo` a `{eventos,
 * truncado}`). Se renderiza el hook de verdad en el servidor (sin DOM:
 * `renderToString` ejecuta su cuerpo una vez) sobre un `QueryClient` real con
 * la caché ya poblada, y se lee lo que devuelve. Fallan si el hook vuelve a
 * exponer la respuesta cruda o si el 404 deja de ser definitivo.
 */

const COMPANY_ID = 1;
const PEDIDO_ID = 7;
const QUERY_KEY = [...DOCUMENT_AUDIT_QUERY_KEY, "timeline", COMPANY_ID, "pedido", PEDIDO_ID];

const httpError = (status: number, data: unknown): AxiosError => {
  const config = { headers: new AxiosHeaders() };
  const response = { status, statusText: "", headers: {}, config, data } as AxiosResponse;
  return new AxiosError("Request failed", String(status), config, undefined, response);
};

const RESPUESTA: BitacoraLineaTiempo = {
  eventos: [
    {
      id: 1,
      created_at: "2026-11-11T18:00:00Z",
      tipo_documento: "pedido",
      documento_id: "7",
      folio: "PED-7",
      accion: "crear",
      accion_display: "Creado",
      estatus_anterior: "",
      estatus_nuevo: "Autorizada",
      estatus_codigo: "AUTORIZADA",
      total: null,
      moneda_id: null,
      sucursal_id: 1,
      origen_tipo: "",
      origen_id: null,
      usuario_id: 3,
      usuario_nombre: "Ana López",
    },
  ],
  truncado: true,
};

type HookResult = ReturnType<typeof useDocumentTimeline>;

/** Renderiza el hook una vez y devuelve lo que expuso. */
const renderHook = (client: QueryClient): HookResult => {
  let result: HookResult | undefined;
  // El resultado sale por una prop (no reasignando una variable externa en el
  // render, que `react-hooks/globals` prohíbe), como en `form-submit-lock.spec`.
  const Probe = ({ onRender }: { onRender: (value: HookResult) => void }) => {
    onRender(useDocumentTimeline("pedido", PEDIDO_ID, COMPANY_ID, { enabled: true }));
    return null;
  };
  renderToString(
    createElement(
      QueryClientProvider,
      { client },
      createElement(Probe, {
        onRender: (value) => {
          result = value;
        },
      }),
    ),
  );
  if (!result) throw new Error("El hook no se ejecutó.");
  return result;
};

const newClient = () => new QueryClient({ defaultOptions: { queries: { retry: 1 } } });

const timelineQuery = (client: QueryClient): Query =>
  client.getQueryCache().find({ queryKey: QUERY_KEY, exact: true })!;

test.describe("useDocumentTimeline", () => {
  test("expone los eventos y el truncado de {eventos, truncado}, no la respuesta cruda", () => {
    const client = newClient();
    client.setQueryData(QUERY_KEY, RESPUESTA);
    const result = renderHook(client);
    expect(result.events).toEqual(RESPUESTA.eventos);
    expect(Array.isArray(result.events)).toBe(true);
    expect(result.isTruncated).toBe(true);
    expect(result.isDefinitiveError).toBe(false);
  });

  test("sin truncado, isTruncated es false", () => {
    const client = newClient();
    client.setQueryData(QUERY_KEY, { ...RESPUESTA, truncado: false });
    expect(renderHook(client).isTruncated).toBe(false);
  });

  test("un 404 es definitivo: no disponible, sin datos ni error inicial", () => {
    // Sin `retryOnMount: false`, montar sobre un error sin datos lo trata como
    // carga nueva (`pending`) y el error nunca llega al hook en este render.
    const client = new QueryClient({ defaultOptions: { queries: { retry: 1, retryOnMount: false } } });
    client.getQueryCache().build(client, { queryKey: QUERY_KEY }).setState({
      status: "error",
      error: httpError(404, { detail: "Documento no encontrado." }),
      errorUpdatedAt: Date.now(),
      fetchStatus: "idle",
    });
    const result = renderHook(client);
    expect(result.isDefinitiveError).toBe(true);
    expect(result.isInitialError).toBe(false);
    expect(result.events).toBeUndefined();
  });

  test("el retry de la consulta no repite un 404 ni un 400, y sí un 500", () => {
    const client = newClient();
    client.setQueryData(QUERY_KEY, RESPUESTA);
    renderHook(client);
    const retry = timelineQuery(client).options.retry as (count: number, error: unknown) => boolean;
    expect(typeof retry).toBe("function");
    expect(retry(0, httpError(404, { detail: "Documento no encontrado." }))).toBe(false);
    expect(retry(0, httpError(400, { documento_id: "Debe ser un número entero." }))).toBe(false);
    expect(retry(0, httpError(500, "<html>"))).toBe(true);
    expect(retry(1, httpError(500, "<html>"))).toBe(false);
  });
});
