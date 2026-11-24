import { expect, test } from "@playwright/test";
import { AxiosError, AxiosHeaders } from "axios";
import { ZodError } from "zod";
import { REQUEST_TIMEOUT_MESSAGE } from "@/src/utils/requestTimeout";
import { stockReportExportErrorMessage } from "@/src/features/stock/utils/stockReportExport";
import {
  mergedPdfErrorMessage,
  uploadPdfErrorMessage,
} from "@/src/features/supplier-invoices/utils/supplierInvoicePdfErrors";
import { loginErrorToastMessage } from "@/src/features/auth/utils/loginErrorMessage";
import {
  CANCELLED_INVOICE_CFDI_CANCEL_UNCONFIRMED_MESSAGE,
  INVOICE_CANCEL_UNCONFIRMED_MESSAGE,
  cancelInvoiceErrorMessage,
} from "@/src/features/invoicing/utils/invoiceCancellation";
import { cancelInvoiceMutationErrorMessage } from "@/src/features/invoicing/hooks/useCancelInvoice";
import { drfActionErrorMessage, handleDrfWriteError } from "@/src/utils/drfWriteErrors";
import { DEFAULT_QUERY_RETRY } from "@/src/constants/queryCache";
import { defaultQueryRetry, retryUnlessNotFound } from "@/src/utils/defaultQueryRetry";
import { retryUnlessDefinitiveRejection } from "@/src/features/picking/hooks/usePickingOnboarding";
import { retryDocumentAuditQuery } from "@/src/features/document-audit/utils/documentAuditErrors";
import { retryCalendarEvents } from "@/src/features/google/hooks/useGoogleCalendarEvents";
import { CalendarEventsPaginationError } from "@/src/features/google/utils/fetchAllCalendarEventPages";
import { retryMovementLedger } from "@/src/features/stock/hooks/useMovementLedger";
import { retryPedidoPdfCatalog } from "@/src/features/orders/utils/loadPedidoForPdf";
import { retryQuoteDocumentCatalog } from "@/src/features/quotes/utils/loadQuoteForDocument";

/**
 * EC-939 (revisión): el mensaje genérico de timeout llega también a las rutas
 * que atienden "sin respuesta" antes de `extractErrorMessage` y a los helpers
 * DRF; ninguna política de `retry` reintenta un timeout, y cada una conserva su
 * regla para el resto de los errores.
 */

const config = { headers: new AxiosHeaders() };
const timeout = () => new AxiosError("timeout of 30000ms exceeded", AxiosError.ETIMEDOUT, config);
const network = () => new AxiosError("Network Error", AxiosError.ERR_NETWORK, config);
const withStatus = (status: number, data: unknown = {}) =>
  new AxiosError(`Request failed with status code ${status}`, "ERR_BAD_REQUEST", config, undefined, {
    status,
    statusText: "",
    data,
    headers: {},
    config,
  });

test.describe("mensaje de timeout en las rutas sin respuesta", () => {
  test("reporte de stock: timeout → genérico; red caída → el de conexión", () => {
    expect(stockReportExportErrorMessage(timeout(), "xlsx")).toBe(REQUEST_TIMEOUT_MESSAGE);
    expect(stockReportExportErrorMessage(network(), "xlsx")).toContain("Revisa tu conexión");
  });

  test("subida del PDF del proveedor: timeout → genérico; red caída → el de tamaño o conexión", () => {
    expect(uploadPdfErrorMessage(timeout())).toBe(REQUEST_TIMEOUT_MESSAGE);
    expect(uploadPdfErrorMessage(network())).toContain("supere el tamaño permitido");
  });

  test("PDF fusionado: timeout → genérico; red caída → el de conexión", () => {
    expect(mergedPdfErrorMessage(timeout())).toBe(REQUEST_TIMEOUT_MESSAGE);
    expect(mergedPdfErrorMessage(network())).toContain("Revisa tu conexión");
  });

  test("login: timeout → genérico; red caída o 5xx → Error de conexión", () => {
    expect(loginErrorToastMessage(timeout())).toBe(REQUEST_TIMEOUT_MESSAGE);
    expect(loginErrorToastMessage(network())).toBe("Error de conexión");
    expect(loginErrorToastMessage(withStatus(500))).toBe("Error de conexión");
  });
});

test.describe("cancelar solo el CFDI de una factura ya cancelada", () => {
  test("un corte sin respuesta habla solo del CFDI", () => {
    expect(cancelInvoiceErrorMessage(timeout(), CANCELLED_INVOICE_CFDI_CANCEL_UNCONFIRMED_MESSAGE)).toBe(
      CANCELLED_INVOICE_CFDI_CANCEL_UNCONFIRMED_MESSAGE,
    );
    expect(
      cancelInvoiceMutationErrorMessage(network(), CANCELLED_INVOICE_CFDI_CANCEL_UNCONFIRMED_MESSAGE),
    ).toBe(CANCELLED_INVOICE_CFDI_CANCEL_UNCONFIRMED_MESSAGE);
  });

  test("cancelar la factura conserva su aviso, y un 400 su motivo", () => {
    expect(cancelInvoiceMutationErrorMessage(timeout())).toBe(INVOICE_CANCEL_UNCONFIRMED_MESSAGE);
    expect(
      cancelInvoiceErrorMessage(
        withStatus(400, { cfdi: "El SAT no canceló el CFDI." }),
        CANCELLED_INVOICE_CFDI_CANCEL_UNCONFIRMED_MESSAGE,
      ),
    ).toBe("El SAT no canceló el CFDI.");
  });
});

test.describe("helpers DRF", () => {
  test("handleDrfWriteError: timeout → genérico; 400 y red sin cambios", () => {
    const fields: string[] = [];
    expect(handleDrfWriteError(timeout(), "No se pudo guardar.", ["nombre"])).toBe(REQUEST_TIMEOUT_MESSAGE);
    expect(handleDrfWriteError(network(), "No se pudo guardar.", ["nombre"])).toBe("No se pudo guardar.");
    expect(
      handleDrfWriteError(withStatus(400, { nombre: ["Requerido."] }), "No se pudo guardar.", ["nombre"], (f) =>
        fields.push(f),
      ),
    ).toBe("No se pudo guardar.");
    expect(fields).toEqual(["nombre"]);
    expect(handleDrfWriteError(withStatus(403, { detail: "Sin permiso." }), "x", [])).toBe("Sin permiso.");
  });

  test("drfActionErrorMessage: timeout → genérico; 404, 400 y red sin cambios", () => {
    expect(drfActionErrorMessage(timeout(), "No se pudo aprobar.", "Ya no existe.")).toBe(REQUEST_TIMEOUT_MESSAGE);
    expect(drfActionErrorMessage(network(), "No se pudo aprobar.", "Ya no existe.")).toBe("No se pudo aprobar.");
    expect(drfActionErrorMessage(withStatus(404), "No se pudo aprobar.", "Ya no existe.")).toBe("Ya no existe.");
    expect(
      drfActionErrorMessage(withStatus(400, { detail: "Ya aprobada." }), "No se pudo aprobar.", "Ya no existe."),
    ).toBe("Ya aprobada.");
  });
});

/** Política de `retry`, los errores que deja de reintentar y los que sigue reintentando. */
const policies: Array<{
  name: string;
  retry: (failureCount: number, error: unknown) => boolean;
  /** Reintentos que concede a un error que sí reintenta. */
  retries: number;
  rejected: unknown[];
  retried: unknown[];
}> = [
  { name: "defaultQueryRetry", retry: defaultQueryRetry, retries: DEFAULT_QUERY_RETRY, rejected: [], retried: [network(), withStatus(404), withStatus(500)] },
  { name: "retryUnlessNotFound (desglose, retrieve fresco, ruta crítica)", retry: retryUnlessNotFound, retries: 1, rejected: [withStatus(404)], retried: [network(), withStatus(500), withStatus(403)] },
  { name: "retryUnlessDefinitiveRejection", retry: retryUnlessDefinitiveRejection, retries: 1, rejected: [withStatus(400), withStatus(403), withStatus(404)], retried: [network(), withStatus(408), withStatus(500)] },
  { name: "retryDocumentAuditQuery", retry: retryDocumentAuditQuery, retries: 1, rejected: [withStatus(400), new ZodError([])], retried: [network(), withStatus(404), withStatus(500)] },
  { name: "retryCalendarEvents", retry: retryCalendarEvents, retries: 1, rejected: [new CalendarEventsPaginationError("demasiadas páginas")], retried: [network(), withStatus(500)] },
  { name: "retryMovementLedger", retry: retryMovementLedger, retries: 1, rejected: [withStatus(400), withStatus(403), withStatus(404), withStatus(409)], retried: [network(), withStatus(500)] },
  { name: "retryPedidoPdfCatalog", retry: retryPedidoPdfCatalog, retries: 2, rejected: [], retried: [network(), withStatus(500), new Error("fallo fuera de HTTP")] },
  { name: "retryQuoteDocumentCatalog", retry: retryQuoteDocumentCatalog, retries: 2, rejected: [], retried: [network(), withStatus(500), new Error("fallo fuera de HTTP")] },
];

for (const { name, retry, retries, rejected, retried } of policies) {
  test(`${name}: no reintenta un timeout y conserva su regla para lo demás`, () => {
    expect(retry(0, timeout())).toBe(false);
    for (const error of rejected) expect(retry(0, error)).toBe(false);
    for (const error of retried) {
      expect(retry(retries - 1, error)).toBe(true);
      expect(retry(retries, error)).toBe(false);
    }
  });
}
