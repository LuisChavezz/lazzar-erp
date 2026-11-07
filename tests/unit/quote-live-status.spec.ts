import { expect, test } from "@playwright/test";
import { resolveLiveQuoteStatus } from "@/src/features/quotes/utils/quoteLiveStatus";
import { getStaleRowDialogNotice } from "@/src/utils/staleRowDialogNotice";
import { PENDING_AUTHORIZATION_QUOTE_STATUS } from "@/src/features/quotes/utils/quoteStatusRules";

/**
 * Estatus vivo de los diálogos de fila de Ventas con el listado paginado
 * (EC-809): que la fila no esté en lo cargado NUNCA es un cambio de estatus, y
 * lo anterior a la apertura no cuenta.
 */

const OPENED_AT = 1_000;
const base = { snapshotEstatus: PENDING_AUTHORIZATION_QUOTE_STATUS, openedAt: OPENED_AT };

/** Lo que decide `RejectQuoteDialog` con ese estatus vivo. */
const rejectNotice = (live: ReturnType<typeof resolveLiveQuoteStatus>) =>
  getStaleRowDialogNotice({
    resource: "quote-reject",
    targetId: 7,
    target: live,
    statusField: "estatus",
    expectedEstado: PENDING_AUTHORIZATION_QUOTE_STATUS,
    isBusy: false,
    messages: { gone: "gone", estadoChanged: (estatus) => `changed ${estatus}` },
  });

test.describe("sin aviso falso", () => {
  test("la fila salió de la página y el detalle aún no llega", () => {
    const live = resolveLiveQuoteStatus({ ...base });
    expect(live).toEqual({ estatus: 2 });
    expect(rejectNotice(live)).toBeNull();
  });

  test("un detalle en caché de ANTES de abrir no cuenta", () => {
    const live = resolveLiveQuoteStatus({ ...base, detail: { estatus: 1, updatedAt: OPENED_AT - 1 } });
    expect(rejectNotice(live)).toBeNull();
  });

  test("un 404 de antes de abrir no cuenta", () => {
    expect(rejectNotice(resolveLiveQuoteStatus({ ...base, detailGoneAt: OPENED_AT - 5 }))).toBeNull();
  });

  test("detalle fresco y fila cargada siguen en Por autorizar", () => {
    const live = resolveLiveQuoteStatus({
      ...base,
      loadedRow: { estatus: 2 },
      detail: { estatus: 2, updatedAt: OPENED_AT + 10 },
    });
    expect(rejectNotice(live)).toBeNull();
  });
});

test.describe("cambio real hecho en otro lado", () => {
  test("el detalle leído al abrir ya dice Autorizada", () => {
    const live = resolveLiveQuoteStatus({ ...base, detail: { estatus: 3, updatedAt: OPENED_AT + 1 } });
    expect(live).toEqual({ estatus: 3 });
    expect(rejectNotice(live)?.message).toBe("changed 3");
  });

  test("la página se releyó y la fila ya está Rechazada", () => {
    const live = resolveLiveQuoteStatus({
      ...base,
      loadedRow: { estatus: 4 },
      detail: { estatus: 2, updatedAt: OPENED_AT + 1 },
    });
    expect(rejectNotice(live)?.message).toBe("changed 4");
  });

  test("el detalle respondió 404 después de abrir: ya no existe", () => {
    const live = resolveLiveQuoteStatus({ ...base, detailGoneAt: OPENED_AT + 3 });
    expect(live).toBeNull();
    expect(rejectNotice(live)?.message).toBe("gone");
  });

  test("un éxito del detalle posterior al 404 lo levanta", () => {
    const live = resolveLiveQuoteStatus({
      ...base,
      detailGoneAt: OPENED_AT + 3,
      detail: { estatus: 2, updatedAt: OPENED_AT + 9 },
    });
    expect(rejectNotice(live)).toBeNull();
  });
});
