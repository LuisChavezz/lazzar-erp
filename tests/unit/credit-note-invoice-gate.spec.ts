import { expect, test } from "@playwright/test";
import {
  getCreditNoteInvoiceGate,
  getCreditNoteInvoiceState,
  INVOICE_STATE_CHECKING_REASON,
  INVOICE_STATE_FORBIDDEN_REASON,
  INVOICE_STATE_UNKNOWN_REASON,
  type CreditNoteGateInvoice,
  type CreditNoteInvoiceReadState,
} from "@/src/features/credit-notes/utils/creditNoteInvoiceGate";

/**
 * EC-929: qué puede hacer el formulario de alta de una nota según la lectura
 * fresca de la factura elegida.
 */

const factura: CreditNoteGateInvoice = {
  folio: "F-10",
  estatus: "Emitida",
  activo: true,
  cfdi_cancelado: false,
  cfdi_cancelacion_solicitada: false,
  cfdi_pendiente: false,
};

const read = (
  over: Partial<CreditNoteInvoiceReadState<CreditNoteGateInvoice>> = {},
): CreditNoteInvoiceReadState<CreditNoteGateInvoice> => ({
  hasInvoice: true,
  invoice: factura,
  isFetching: false,
  isFetchedAfterMount: true,
  isInitialError: false,
  definitiveError: null,
  ...over,
});

const gateOf = (over: Partial<CreditNoteInvoiceReadState<CreditNoteGateInvoice>> = {}) =>
  getCreditNoteInvoiceGate(getCreditNoteInvoiceState(read(over)), "F-10");

test("sin factura elegida: nada que bloquear", () => {
  expect(getCreditNoteInvoiceState(read({ hasInvoice: false }))).toEqual({ status: "none" });
  expect(gateOf({ hasInvoice: false })).toEqual({ draftBlockReason: null, emitBlockReason: null });
});

test("factura que admite la nota: borrador y emitir", () => {
  expect(getCreditNoteInvoiceState(read())).toEqual({ status: "loaded", invoice: factura });
  expect(gateOf()).toEqual({ draftBlockReason: null, emitBlockReason: null });
});

test("mientras llega la lectura de esta elección (aunque haya copia en caché): solo bloquea emitir", () => {
  expect(getCreditNoteInvoiceState(read({ isFetching: true, isFetchedAfterMount: false })).status).toBe(
    "checking",
  );
  expect(getCreditNoteInvoiceState(read({ invoice: undefined })).status).toBe("checking");
  expect(gateOf({ isFetching: true, isFetchedAfterMount: false })).toEqual({
    draftBlockReason: null,
    emitBlockReason: INVOICE_STATE_CHECKING_REASON,
  });
});

test("un refresco en segundo plano de una lectura ya hecha no vuelve a 'consultando'", () => {
  expect(getCreditNoteInvoiceState(read({ isFetching: true })).status).toBe("loaded");
});

test("un error durante el reintento se trata como 'consultando'", () => {
  expect(
    getCreditNoteInvoiceState(read({ invoice: undefined, isInitialError: true, isFetching: true })).status,
  ).toBe("checking");
  expect(
    getCreditNoteInvoiceState(read({ invoice: undefined, definitiveError: "notFound", isFetching: true }))
      .status,
  ).toBe("checking");
});

test("fallo reintentable: bloquea emitir, el borrador sigue", () => {
  expect(getCreditNoteInvoiceState(read({ invoice: undefined, isInitialError: true })).status).toBe(
    "unavailable",
  );
  expect(gateOf({ invoice: undefined, isInitialError: true })).toEqual({
    draftBlockReason: null,
    emitBlockReason: INVOICE_STATE_UNKNOWN_REASON,
  });
});

test("404: definitivo, bloquea borrador y emitir", () => {
  expect(getCreditNoteInvoiceState(read({ invoice: undefined, definitiveError: "notFound" })).status).toBe(
    "notFound",
  );
  const reason = "La factura F-10 no está disponible: no admite notas de crédito.";
  expect(gateOf({ invoice: undefined, definitiveError: "notFound" })).toEqual({
    draftBlockReason: reason,
    emitBlockReason: reason,
  });
});

test("403: definitivo, bloquea emitir con el motivo de permiso y deja el borrador", () => {
  expect(getCreditNoteInvoiceState(read({ invoice: undefined, definitiveError: "forbidden" })).status).toBe(
    "forbidden",
  );
  expect(gateOf({ invoice: undefined, definitiveError: "forbidden" })).toEqual({
    draftBlockReason: null,
    emitBlockReason: INVOICE_STATE_FORBIDDEN_REASON,
  });
});

test("no acreditable (cancelada, CFDI cancelado, cancelación solicitada, eliminada): bloquea los dos", () => {
  const casos: [Partial<CreditNoteGateInvoice>, string][] = [
    [{ estatus: "Cancelada" }, "La factura F-10 está cancelada: no admite notas de crédito."],
    [{ cfdi_cancelado: true }, "La factura F-10 tiene su CFDI cancelado ante el SAT: no admite notas de crédito."],
    [
      { cfdi_cancelacion_solicitada: true },
      "La factura F-10 tiene la cancelación de su CFDI pendiente de que el receptor la acepte: no admite notas de crédito.",
    ],
    [{ activo: false }, "La factura F-10 no está disponible: no admite notas de crédito."],
  ];
  for (const [cambio, reason] of casos) {
    const invoice = { ...factura, ...cambio };
    expect(getCreditNoteInvoiceState(read({ invoice }))).toEqual({ status: "notCreditable", reason });
    expect(gateOf({ invoice })).toEqual({ draftBlockReason: reason, emitBlockReason: reason });
  }
});

test("no acreditable gana al timbrado pendiente", () => {
  const invoice = { ...factura, cfdi_cancelado: true, cfdi_pendiente: true };
  expect(getCreditNoteInvoiceState(read({ invoice })).status).toBe("notCreditable");
});

test("timbrado pendiente: solo borrador", () => {
  const invoice = { ...factura, cfdi_pendiente: true };
  const reason =
    "La factura F-10 tiene un timbrado pendiente de confirmación: guarda la nota como borrador y emítela cuando se confirme.";
  expect(getCreditNoteInvoiceState(read({ invoice }))).toEqual({ status: "pending", reason, invoice });
  expect(gateOf({ invoice })).toEqual({ draftBlockReason: null, emitBlockReason: reason });
});

test("404 sin folio en la CxC: la nombra como el resto del módulo", () => {
  const state = getCreditNoteInvoiceState(read({ invoice: undefined, definitiveError: "notFound" }));
  expect(getCreditNoteInvoiceGate(state, null).draftBlockReason).toBe(
    "La factura relacionada no está disponible: no admite notas de crédito.",
  );
});
