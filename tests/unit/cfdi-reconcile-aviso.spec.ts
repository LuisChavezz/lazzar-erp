import { expect, test } from "@playwright/test";
import { MutationObserver, QueryClient, type QueryKey } from "@tanstack/react-query";
import toast from "react-hot-toast";
import * as toastWarningModule from "@/src/utils/toastWarning";
import { reconcileInvoiceCfdiMutationOptions } from "@/src/features/invoicing/hooks/useReconcileInvoiceCfdi";
import { reconcileNotaCreditoCfdiMutationOptions } from "@/src/features/credit-notes/hooks/useReconcileNotaCreditoCfdi";

/**
 * Pruebas unitarias de EC-761: el `aviso` de `conciliar-cfdi/` (facturas y
 * notas de crédito). Con texto, el usuario ve ESE texto tal cual como
 * advertencia y nunca el toast de éxito; sin él, todo sigue como antes. Las
 * invalidaciones de `onSettled` corren en los dos casos. Sin React: la mutación
 * corre con un `MutationObserver` sobre un `QueryClient` real, con las
 * peticiones (`v1_api`) y los toasts sustituidos. Corren con `npm run test:unit`.
 */

const ID = 41;

type ToastKind = "success" | "error" | "warning";

interface Run {
  posts: string[];
  invalidated: QueryKey[];
  toasts: { kind: ToastKind; message: string }[];
}

/** Ejecuta UNA conciliación: `retrieve` es el GET fresco previo y `reconcile` la respuesta del POST. */
const runReconcile = async (
  buildOptions: (queryClient: QueryClient) => ReturnType<typeof reconcileInvoiceCfdiMutationOptions>
    | ReturnType<typeof reconcileNotaCreditoCfdiMutationOptions>,
  retrieve: unknown,
  reconcile: unknown,
): Promise<Run> => {
  const run: Run = { posts: [], invalidated: [], toasts: [] };
  const { v1_api } = await import("@/src/api/v1.api");
  const originalGet = v1_api.get;
  const originalPost = v1_api.post;
  const originalSuccess = toast.success;
  const originalError = toast.error;
  const warningModule = toastWarningModule as { toastWarning: (message: string) => void };
  const originalWarning = warningModule.toastWarning;

  v1_api.get = (async () => ({ data: retrieve })) as typeof v1_api.get;
  v1_api.post = (async (url: string) => {
    run.posts.push(url);
    return { data: reconcile };
  }) as typeof v1_api.post;
  toast.success = ((message: string) => {
    run.toasts.push({ kind: "success", message });
    return "";
  }) as typeof toast.success;
  toast.error = ((message: string) => {
    run.toasts.push({ kind: "error", message });
    return "";
  }) as typeof toast.error;
  warningModule.toastWarning = (message: string) => {
    run.toasts.push({ kind: "warning", message });
  };

  const queryClient = new QueryClient();
  const originalInvalidate = queryClient.invalidateQueries.bind(queryClient);
  queryClient.invalidateQueries = ((filters?: { queryKey?: QueryKey }) => {
    if (filters?.queryKey) run.invalidated.push(filters.queryKey);
    return originalInvalidate(filters);
  }) as typeof queryClient.invalidateQueries;

  try {
    const observer = new MutationObserver(queryClient, buildOptions(queryClient) as never);
    await observer.mutate(undefined as never).catch(() => undefined);
  } finally {
    v1_api.get = originalGet;
    v1_api.post = originalPost;
    toast.success = originalSuccess;
    toast.error = originalError;
    warningModule.toastWarning = originalWarning;
  }
  return run;
};

const AVISO_FACTURA =
  "La factura está cancelada, pero su CFDI sigue vigente ante el SAT. Vuelve a cancelar la factura para cancelarlo también ante el SAT.";
const AVISO_NOTA =
  "La nota de crédito está cancelada, pero su CFDI sigue vigente ante el SAT. Pide a contabilidad que lo cancele en Facturama.";

test.describe("conciliar-cfdi/ de una factura", () => {
  const options = (queryClient: QueryClient) => reconcileInvoiceCfdiMutationOptions(queryClient, ID);
  const pendiente = { id: ID, folio: "F-1", cfdi_pendiente: true, cfdi_uuid: null };
  const invoiceKeys = [["invoices"], ["invoice-detail", ID], ["invoice-desglose", ID]];

  test("con aviso: el aviso tal cual como advertencia, sin éxito, e invalida igual", async () => {
    const run = await runReconcile(options, pendiente, {
      resultado: "timbrado",
      aviso: AVISO_FACTURA,
      factura: { ...pendiente, cfdi_pendiente: false, cfdi_uuid: "UUID-1", estatus: "Cancelada" },
    });
    expect(run.posts).toEqual([`/finanzas/facturas/${ID}/conciliar-cfdi/`]);
    expect(run.toasts).toEqual([{ kind: "warning", message: AVISO_FACTURA }]);
    expect(run.invalidated).toEqual(invoiceKeys);
  });

  test("timbrado sin aviso: el éxito de siempre", async () => {
    const run = await runReconcile(options, pendiente, {
      resultado: "timbrado",
      aviso: null,
      factura: { ...pendiente, cfdi_pendiente: false, cfdi_uuid: "UUID-1" },
    });
    expect(run.toasts).toEqual([
      {
        kind: "success",
        message:
          "El CFDI de la factura F-1 sí existía en Facturama: la factura ya está timbrada. UUID UUID-1",
      },
    ]);
    expect(run.invalidated).toEqual(invoiceKeys);
  });

  test("liberado: el éxito de siempre", async () => {
    const run = await runReconcile(options, pendiente, {
      resultado: "liberado",
      aviso: null,
      factura: { ...pendiente, cfdi_pendiente: false },
    });
    expect(run.toasts).toEqual([
      {
        kind: "success",
        message: "Facturama no tenía ningún CFDI de la factura F-1: se liberó el timbrado pendiente.",
      },
    ]);
    expect(run.invalidated).toEqual(invoiceKeys);
  });
});

test.describe("conciliar-cfdi/ de una nota de crédito", () => {
  const options = (queryClient: QueryClient) =>
    reconcileNotaCreditoCfdiMutationOptions(queryClient, ID);
  const pendiente = { id: ID, folio: "NC-1", cfdi_pendiente: true, cfdi_uuid: null };
  const noteKeys = [["credit-notes"], ["credit-note-detail"]];

  test("con aviso: el aviso tal cual como advertencia, sin éxito, e invalida igual", async () => {
    const run = await runReconcile(options, pendiente, {
      resultado: "timbrado",
      aviso: AVISO_NOTA,
      nota_credito: { ...pendiente, cfdi_pendiente: false, cfdi_uuid: "UUID-2", estatus: "Cancelada" },
    });
    expect(run.posts).toEqual([`/finanzas/notas-credito/${ID}/conciliar-cfdi/`]);
    expect(run.toasts).toEqual([{ kind: "warning", message: AVISO_NOTA }]);
    expect(run.invalidated).toEqual(noteKeys);
  });

  test("timbrado sin aviso: el éxito de siempre", async () => {
    const run = await runReconcile(options, pendiente, {
      resultado: "timbrado",
      aviso: null,
      nota_credito: { ...pendiente, cfdi_pendiente: false, cfdi_uuid: "UUID-2" },
    });
    expect(run.toasts).toEqual([
      {
        kind: "success",
        message: "El CFDI de la nota NC-1 sí existía en Facturama: la nota ya está timbrada. UUID UUID-2",
      },
    ]);
    expect(run.invalidated).toEqual(noteKeys);
  });

  test("liberado: el éxito de siempre", async () => {
    const run = await runReconcile(options, pendiente, {
      resultado: "liberado",
      aviso: null,
      nota_credito: { ...pendiente, cfdi_pendiente: false },
    });
    expect(run.toasts).toEqual([
      {
        kind: "success",
        message: "Facturama no tenía ningún CFDI de la nota NC-1: se liberó el timbrado pendiente.",
      },
    ]);
    expect(run.invalidated).toEqual(noteKeys);
  });
});
