import { expect, test } from "@playwright/test";
import { AxiosError, AxiosHeaders } from "axios";
import {
  INVOICE_STAMP_UNCONFIRMED_MESSAGE,
  stampInvoiceErrorMessage,
} from "@/src/features/invoicing/utils/invoiceStamping";
import {
  cancelInvoiceErrorMessage,
  INVOICE_CANCEL_UNCONFIRMED_MESSAGE,
} from "@/src/features/invoicing/utils/invoiceCancellation";
import {
  cancelNotaCreditoErrorMessage,
  CREDIT_NOTE_CANCEL_UNCONFIRMED_MESSAGE,
  CREDIT_NOTE_STAMP_UNCONFIRMED_MESSAGE,
  stampNotaCreditoErrorMessage,
} from "@/src/features/credit-notes/utils/creditNoteErrors";
import {
  COBRO_REP_CANCEL_UNCONFIRMED_MESSAGE,
  cancelCobroRepErrorMessage,
} from "@/src/features/collections/utils/cobroRepCancellation";
import {
  COBRO_REP_UNCONFIRMED_MESSAGE,
  stampCobroRepErrorMessage,
} from "@/src/features/collections/utils/cobroRepStamping";
import { COBRO_CANCEL_UNCONFIRMED_MESSAGE } from "@/src/features/collections/utils/cobroCancellation";
import { cobroCancelDialogContent } from "@/src/features/collections/utils/cobroCancelAction";
import { QueryClient } from "@tanstack/react-query";

/** EC-950: el cobro se cancela en `CancelReasonDialog`; su clasificador da el mensaje. */
const cancelCobroErrorMessage = (error: unknown) =>
  cobroCancelDialogContent(new QueryClient(), { id: 1, folio: "COB-1", estatus: "Aplicado" }).action.classifyError(error)
    .message;

/**
 * EC-939: las escrituras fiscales lentas (timbrar y cancelar facturas, notas de
 * crédito, REP y cobros) avisan que el resultado es desconocido cuando la
 * petición se corta sin respuesta, también ante el `ETIMEDOUT` que da ahora el
 * tope de `v1_api`. Facturas se suma al patrón de REP y cobros; notas de
 * crédito ya lo tenía (`isUnconfirmedFailure`) y lo sigue detectando.
 */

const config = { headers: new AxiosHeaders() };
const timeout = () => new AxiosError("timeout of 120000ms exceeded", AxiosError.ETIMEDOUT, config);
const noResponse = () => new AxiosError("Network Error", AxiosError.ERR_NETWORK, config);
const withResponse = (status: number, data: unknown) =>
  new AxiosError(`Request failed with status code ${status}`, "ERR_BAD_REQUEST", config, undefined, {
    status,
    statusText: "",
    data,
    headers: {},
    config,
  });

const cases = [
  ["timbrar factura", stampInvoiceErrorMessage, INVOICE_STAMP_UNCONFIRMED_MESSAGE],
  ["cancelar factura", cancelInvoiceErrorMessage, INVOICE_CANCEL_UNCONFIRMED_MESSAGE],
  ["timbrar nota de crédito", stampNotaCreditoErrorMessage, CREDIT_NOTE_STAMP_UNCONFIRMED_MESSAGE],
  ["cancelar nota de crédito", cancelNotaCreditoErrorMessage, CREDIT_NOTE_CANCEL_UNCONFIRMED_MESSAGE],
  ["timbrar REP", stampCobroRepErrorMessage, COBRO_REP_UNCONFIRMED_MESSAGE],
  ["cancelar REP", cancelCobroRepErrorMessage, COBRO_REP_CANCEL_UNCONFIRMED_MESSAGE],
  ["cancelar cobro", cancelCobroErrorMessage, COBRO_CANCEL_UNCONFIRMED_MESSAGE],
] as const;

for (const [name, message, unconfirmed] of cases) {
  test(`${name}: un timeout (ETIMEDOUT) y un corte sin respuesta dan "resultado desconocido"`, () => {
    expect(message(timeout())).toBe(unconfirmed);
    expect(message(noResponse())).toBe(unconfirmed);
    expect(message(withResponse(504, "<html>Gateway Timeout</html>"))).toBe(unconfirmed);
  });
}

test("facturas: un 400 del backend sigue mostrando su motivo, no el aviso", () => {
  expect(stampInvoiceErrorMessage(withResponse(400, { cfdi: ["Faltan datos fiscales."] }))).toBe(
    "Faltan datos fiscales.",
  );
  expect(cancelInvoiceErrorMessage(withResponse(400, { motivo_sat: "Motivo inválido." }))).toBe(
    "Motivo inválido.",
  );
});

test("facturas: un 500 sin cuerpo útil cae al respaldo, no al aviso", () => {
  expect(stampInvoiceErrorMessage(withResponse(500, {}))).toBe("No se pudo timbrar la factura.");
  expect(cancelInvoiceErrorMessage(withResponse(500, {}))).toBe("No se pudo cancelar la factura.");
});
