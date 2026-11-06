import { expect, test } from "@playwright/test";
import { AxiosError, AxiosHeaders, type AxiosResponse } from "axios";
import { PrecheckError } from "@/src/hooks/useMutationLock";
import {
  CREDIT_NOTE_CANCEL_UNCONFIRMED_MESSAGE,
  cancelNotaCreditoErrorMessage,
} from "@/src/features/credit-notes/utils/creditNoteErrors";

/**
 * Pruebas unitarias de EC-761: el mensaje de un fallo de
 * `POST /finanzas/notas-credito/{id}/cancelar/` (`cancelNotaCreditoErrorMessage`,
 * el que usa `useCancelNotaCredito`). El motivo del backend bajo `cfdi` llega
 * completo y tal cual; el orden es el de `cancelInvoiceErrorMessage`, con el
 * `403` primero. Corren con `npm run test:unit`.
 */

const httpError = (status: number, data: unknown): AxiosError => {
  const config = { headers: new AxiosHeaders() };
  const response = { status, statusText: "", headers: {}, config, data } as AxiosResponse;
  return new AxiosError("Request failed", "ERR_BAD_REQUEST", config, undefined, response);
};

const PENDIENTE =
  "Hay un timbrado sin confirmar: usa conciliar-cfdi/ para traer el timbre de Facturama o liberarlo.";
const TIMBRADA =
  "La nota tiene CFDI de egreso timbrado; cancélalo en Facturama antes de cancelarla aquí.";
const FALLBACK = "Error al cancelar la nota de crédito";

test("cfdi como lista (forma de DRF) llega completo, sin el genérico", () => {
  expect(cancelNotaCreditoErrorMessage(httpError(400, { cfdi: [PENDIENTE] }))).toBe(PENDIENTE);
  expect(cancelNotaCreditoErrorMessage(httpError(400, { cfdi: [TIMBRADA] }))).toBe(TIMBRADA);
});

test("cfdi como string también llega tal cual", () => {
  expect(cancelNotaCreditoErrorMessage(httpError(400, { cfdi: TIMBRADA }))).toBe(TIMBRADA);
});

test("cfdi gana a estatus y a cualquier otro campo", () => {
  expect(
    cancelNotaCreditoErrorMessage(
      httpError(400, { poliza: ["descuadre"], estatus: ["otro"], cfdi: [TIMBRADA] }),
    ),
  ).toBe(TIMBRADA);
  expect(
    cancelNotaCreditoErrorMessage(httpError(400, { poliza: ["descuadre"], estatus: ["otro"] })),
  ).toBe("otro");
});

test("sin cfdi ni estatus: otro campo (poliza) o el detail (404, 409)", () => {
  const poliza = "La póliza de la nota no cuadra: cargos 10, abonos 9.";
  expect(cancelNotaCreditoErrorMessage(httpError(400, { poliza: [poliza] }))).toBe(poliza);
  expect(cancelNotaCreditoErrorMessage(httpError(404, { detail: "La nota de crédito ya no existe." }))).toBe(
    "La nota de crédito ya no existe.",
  );
  expect(
    cancelNotaCreditoErrorMessage(
      httpError(409, { detail: "Otra operación está modificando estos registros en este momento. Intente de nuevo." }),
    ),
  ).toBe("Otra operación está modificando estos registros en este momento. Intente de nuevo.");
});

test("un 403 muestra su detail antes que cualquier campo", () => {
  expect(
    cancelNotaCreditoErrorMessage(
      httpError(403, { detail: "No tienes permiso para registrar o cancelar notas de crédito.", cfdi: ["x"] }),
    ),
  ).toBe("No tienes permiso para registrar o cancelar notas de crédito.");
});

test("el precheck muestra su propio mensaje; sin cuerpo útil, el genérico", () => {
  expect(cancelNotaCreditoErrorMessage(new PrecheckError("La nota NC-1 ya estaba cancelada."))).toBe(
    "La nota NC-1 ya estaba cancelada.",
  );
  expect(cancelNotaCreditoErrorMessage(httpError(400, {}))).toBe(FALLBACK);
});

test("un 403 sin motivo usable cae al genérico, nunca a un campo", () => {
  expect(cancelNotaCreditoErrorMessage(httpError(403, { cfdi: [TIMBRADA] }))).toBe(FALLBACK);
  expect(cancelNotaCreditoErrorMessage(httpError(403, { detail: "<html><body>403</body></html>" }))).toBe(
    FALLBACK,
  );
});

test("sin respuesta o con 5xx no se afirma que falló: pudo cancelarse", () => {
  const config = { headers: new AxiosHeaders() };
  const timeout = new AxiosError("timeout of 30000ms exceeded", "ECONNABORTED", config);
  expect(cancelNotaCreditoErrorMessage(timeout)).toBe(CREDIT_NOTE_CANCEL_UNCONFIRMED_MESSAGE);
  expect(cancelNotaCreditoErrorMessage(httpError(504, "<html>"))).toBe(CREDIT_NOTE_CANCEL_UNCONFIRMED_MESSAGE);
  // El cuerpo de un 5xx no es del backend: nunca se muestra, aunque traiga cfdi.
  expect(cancelNotaCreditoErrorMessage(httpError(500, { cfdi: [TIMBRADA] }))).toBe(
    CREDIT_NOTE_CANCEL_UNCONFIRMED_MESSAGE,
  );
});
