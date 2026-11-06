import { expect, test } from "@playwright/test";
import {
  MutationObserver,
  QueryClient,
  type MutationObserverOptions,
  type QueryKey,
} from "@tanstack/react-query";
import { AxiosError, AxiosHeaders, type AxiosResponse } from "axios";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import toast, { useToasterStore, type Toast } from "react-hot-toast";
import { reconcileInvoiceCfdiMutationOptions } from "@/src/features/invoicing/hooks/useReconcileInvoiceCfdi";
import { reconcileNotaCreditoCfdiMutationOptions } from "@/src/features/credit-notes/hooks/useReconcileNotaCreditoCfdi";

/**
 * Pruebas unitarias de EC-761: el `aviso` de `conciliar-cfdi/` (facturas y
 * notas de crédito). Con texto, el usuario ve ESE texto tal cual como
 * advertencia y nunca el toast de éxito; sin él, todo sigue como antes. Las
 * invalidaciones de `onSettled` corren en todos los casos. También el camino
 * sin pendiente (no hay POST) y el de error.
 *
 * Sin React en la mutación: corre con un `MutationObserver` sobre un
 * `QueryClient` real, con las peticiones (`v1_api`) sustituidas. Los toasts NO
 * se sustituyen: se leen del store real de react-hot-toast, renderizando en el
 * servidor un componente que llama a `useToasterStore`. Corren con
 * `npm run test:unit`.
 */

const ID = 41;

interface Run {
  posts: string[];
  invalidated: QueryKey[];
  toasts: ToastSnapshot[];
}

type ToastSnapshot = Pick<Toast, "type" | "message" | "icon">;

/** Pinta el store como JSON sin escapar (los mensajes no traen `</script>`). */
const ToastsProbe = () =>
  createElement("script", {
    type: "application/json",
    dangerouslySetInnerHTML: {
      __html: JSON.stringify(
        useToasterStore().toasts.map(({ type, message, icon }) => ({ type, message, icon })),
      ),
    },
  });

/** Toasts que hay ahora mismo en el store de react-hot-toast, del más viejo al más nuevo. */
const readToasts = (): ToastSnapshot[] => {
  const html = renderToString(createElement(ToastsProbe));
  const json = /<script type="application\/json">([\s\S]*)<\/script>/.exec(html)?.[1];
  if (json === undefined) throw new Error(`No se pudo leer el store de toasts: ${html}`);
  return (JSON.parse(json) as ToastSnapshot[]).reverse();
};

const httpError = (status: number, data: unknown): AxiosError => {
  const config = { headers: new AxiosHeaders() };
  const response = { status, statusText: "", headers: {}, config, data } as AxiosResponse;
  return new AxiosError("Request failed", "ERR_BAD_REQUEST", config, undefined, response);
};

/**
 * Ejecuta UNA conciliación: `retrieve` es el GET fresco previo y `respond`
 * decide el POST (devuelve el cuerpo del `200` o lanza el error).
 */
const runReconcile = async <TData>(
  buildOptions: (queryClient: QueryClient) => MutationObserverOptions<TData, unknown, void>,
  retrieve: unknown,
  respond: () => unknown,
): Promise<Run> => {
  const run: Run = { posts: [], invalidated: [], toasts: [] };
  const { v1_api } = await import("@/src/api/v1.api");
  const originalGet = v1_api.get;
  const originalPost = v1_api.post;
  v1_api.get = (async () => ({ data: retrieve })) as typeof v1_api.get;
  v1_api.post = (async (url: string) => {
    run.posts.push(url);
    return { data: respond() };
  }) as typeof v1_api.post;
  toast.remove();

  const queryClient = new QueryClient();
  const originalInvalidate = queryClient.invalidateQueries.bind(queryClient);
  queryClient.invalidateQueries = ((filters?: { queryKey?: QueryKey }) => {
    if (filters?.queryKey) run.invalidated.push(filters.queryKey);
    return originalInvalidate(filters);
  }) as typeof queryClient.invalidateQueries;

  try {
    const observer = new MutationObserver(queryClient, buildOptions(queryClient));
    await observer.mutate().catch(() => undefined);
  } finally {
    v1_api.get = originalGet;
    v1_api.post = originalPost;
  }
  run.toasts = readToasts();
  toast.remove();
  return run;
};

const warning = (message: string) => ({ type: "blank", message, icon: "⚠️" });
const success = (message: string) => ({ type: "success", message, icon: undefined });
const error = (message: string) => ({ type: "error", message, icon: undefined });

const AVISO_FACTURA =
  "La factura está cancelada, pero su CFDI sigue vigente ante el SAT. Vuelve a cancelar la factura para cancelarlo también ante el SAT.";
const AVISO_NOTA =
  "La nota de crédito está cancelada, pero su CFDI sigue vigente ante el SAT. Pide a contabilidad que lo cancele en Facturama.";
const CFDI_ERROR = "El timbrado es muy reciente; espera un minuto y vuelve a conciliar.";

test.describe("conciliar-cfdi/ de una factura", () => {
  const options = (queryClient: QueryClient) => reconcileInvoiceCfdiMutationOptions(queryClient, ID);
  const pendiente = { id: ID, folio: "F-1", cfdi_pendiente: true, cfdi_uuid: null };
  const invoiceKeys = [["invoices"], ["invoice-detail", ID], ["invoice-desglose", ID]];

  test("con aviso: el aviso tal cual como advertencia, sin éxito, e invalida igual", async () => {
    const run = await runReconcile(options, pendiente, () => ({
      resultado: "timbrado",
      aviso: AVISO_FACTURA,
      factura: { ...pendiente, cfdi_pendiente: false, cfdi_uuid: "UUID-1", estatus: "Cancelada" },
    }));
    expect(run.posts).toEqual([`/finanzas/facturas/${ID}/conciliar-cfdi/`]);
    expect(run.toasts).toEqual([warning(AVISO_FACTURA)]);
    expect(run.invalidated).toEqual(invoiceKeys);
  });

  test("timbrado sin aviso: el éxito de siempre", async () => {
    const run = await runReconcile(options, pendiente, () => ({
      resultado: "timbrado",
      aviso: null,
      factura: { ...pendiente, cfdi_pendiente: false, cfdi_uuid: "UUID-1" },
    }));
    expect(run.toasts).toEqual([
      success(
        "El CFDI de la factura F-1 sí existía en Facturama: la factura ya está timbrada. UUID UUID-1",
      ),
    ]);
    expect(run.invalidated).toEqual(invoiceKeys);
  });

  test("liberado: el éxito de siempre", async () => {
    const run = await runReconcile(options, pendiente, () => ({
      resultado: "liberado",
      aviso: null,
      factura: { ...pendiente, cfdi_pendiente: false },
    }));
    expect(run.toasts).toEqual([
      success("Facturama no tenía ningún CFDI de la factura F-1: se liberó el timbrado pendiente."),
    ]);
    expect(run.invalidated).toEqual(invoiceKeys);
  });

  test("sin pendiente en el retrieve fresco: no hay POST ni se relee el retrieve", async () => {
    const run = await runReconcile(options, { ...pendiente, cfdi_pendiente: false }, () => {
      throw new Error("no debía conciliar");
    });
    expect(run.posts).toEqual([]);
    expect(run.toasts).toEqual([
      error("La factura F-1 ya no tiene un timbrado pendiente de confirmación."),
    ]);
    expect(run.invalidated).toEqual([["invoices"], ["invoice-desglose", ID]]);
  });

  test("error del backend: su motivo bajo cfdi tal cual, e invalida igual", async () => {
    const run = await runReconcile(options, pendiente, () => {
      throw httpError(400, { cfdi: [CFDI_ERROR] });
    });
    expect(run.posts).toEqual([`/finanzas/facturas/${ID}/conciliar-cfdi/`]);
    expect(run.toasts).toEqual([error(CFDI_ERROR)]);
    expect(run.invalidated).toEqual(invoiceKeys);
  });
});

test.describe("conciliar-cfdi/ de una nota de crédito", () => {
  const options = (queryClient: QueryClient) =>
    reconcileNotaCreditoCfdiMutationOptions(queryClient, ID);
  const pendiente = { id: ID, folio: "NC-1", cfdi_pendiente: true, cfdi_uuid: null };
  const noteKeys = [["credit-notes"], ["credit-note-detail"]];

  test("con aviso: el aviso tal cual como advertencia, sin éxito, e invalida igual", async () => {
    const run = await runReconcile(options, pendiente, () => ({
      resultado: "timbrado",
      aviso: AVISO_NOTA,
      nota_credito: { ...pendiente, cfdi_pendiente: false, cfdi_uuid: "UUID-2", estatus: "Cancelada" },
    }));
    expect(run.posts).toEqual([`/finanzas/notas-credito/${ID}/conciliar-cfdi/`]);
    expect(run.toasts).toEqual([warning(AVISO_NOTA)]);
    expect(run.invalidated).toEqual(noteKeys);
  });

  test("timbrado sin aviso: el éxito de siempre", async () => {
    const run = await runReconcile(options, pendiente, () => ({
      resultado: "timbrado",
      aviso: null,
      nota_credito: { ...pendiente, cfdi_pendiente: false, cfdi_uuid: "UUID-2" },
    }));
    expect(run.toasts).toEqual([
      success("El CFDI de la nota NC-1 sí existía en Facturama: la nota ya está timbrada. UUID UUID-2"),
    ]);
    expect(run.invalidated).toEqual(noteKeys);
  });

  test("liberado: el éxito de siempre", async () => {
    const run = await runReconcile(options, pendiente, () => ({
      resultado: "liberado",
      aviso: null,
      nota_credito: { ...pendiente, cfdi_pendiente: false },
    }));
    expect(run.toasts).toEqual([
      success("Facturama no tenía ningún CFDI de la nota NC-1: se liberó el timbrado pendiente."),
    ]);
    expect(run.invalidated).toEqual(noteKeys);
  });

  test("sin pendiente en el retrieve fresco: no hay POST", async () => {
    const run = await runReconcile(options, { ...pendiente, cfdi_pendiente: false }, () => {
      throw new Error("no debía conciliar");
    });
    expect(run.posts).toEqual([]);
    expect(run.toasts).toEqual([error("La nota NC-1 ya no tiene un timbrado pendiente de confirmación.")]);
    expect(run.invalidated).toEqual(noteKeys);
  });

  test("error del backend: su motivo bajo cfdi tal cual, e invalida igual", async () => {
    const run = await runReconcile(options, pendiente, () => {
      throw httpError(400, { cfdi: [CFDI_ERROR] });
    });
    expect(run.posts).toEqual([`/finanzas/notas-credito/${ID}/conciliar-cfdi/`]);
    expect(run.toasts).toEqual([error(CFDI_ERROR)]);
    expect(run.invalidated).toEqual(noteKeys);
  });
});
