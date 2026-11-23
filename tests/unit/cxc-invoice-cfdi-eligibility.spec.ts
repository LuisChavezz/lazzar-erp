import { expect, test } from "@playwright/test";
import {
  CXC_NOT_COBRABLE_FALLBACK_REASON,
  getCxcInvoiceCfdiEligibility,
  type CxcInvoiceCfdiReasons,
} from "@/src/features/accounts-receivable/utils/cxcInvoiceCfdiEligibility";
import { getCxcCobroEligibility } from "@/src/features/collections/utils/cxcCobroEligibility";
import {
  getCreditNoteCxcEligibility,
  getCreditNoteCxcSelectionBlockReason,
} from "@/src/features/credit-notes/utils/creditNoteCxcEligibility";

/**
 * EC-929: cobros y notas de crédito comparten la regla de qué admite una CxC
 * según el CFDI de su factura; solo cambian los textos.
 */

const base = {
  factura_folio: "F-10",
  estatus: "Pendiente" as const,
  saldo: "100.00",
  cobrable: true,
  factura_cfdi_cancelado: false,
  factura_cfdi_cancelacion_solicitada: false,
  factura_cfdi_pendiente: false,
};

const CASES = {
  vigente: base,
  cancelado: { ...base, cobrable: false, factura_cfdi_cancelado: true },
  solicitada: { ...base, cobrable: false, factura_cfdi_cancelacion_solicitada: true },
  pendiente: { ...base, cobrable: false, factura_cfdi_pendiente: true },
  respaldo: { ...base, cobrable: false },
};

test("núcleo: cada causa elige el texto que le pasa el documento", () => {
  const reasons: CxcInvoiceCfdiReasons = {
    cfdiCancelled: (folio) => `cancelado ${folio}`,
    cancellationRequested: (folio) => `solicitada ${folio}`,
    stampPending: (folio) => `pendiente ${folio}`,
  };
  expect(getCxcInvoiceCfdiEligibility(CASES.vigente, reasons)).toEqual({ kind: "eligible" });
  expect(getCxcInvoiceCfdiEligibility(CASES.cancelado, reasons)).toEqual({ kind: "blocked", reason: "cancelado F-10" });
  expect(getCxcInvoiceCfdiEligibility(CASES.solicitada, reasons)).toEqual({ kind: "blocked", reason: "solicitada F-10" });
  expect(getCxcInvoiceCfdiEligibility(CASES.pendiente, reasons)).toEqual({ kind: "draftOnly", reason: "pendiente F-10" });
  expect(getCxcInvoiceCfdiEligibility(CASES.respaldo, reasons)).toEqual({
    kind: "blocked",
    reason: CXC_NOT_COBRABLE_FALLBACK_REASON,
  });
  // Un folio vacío llega como `null`.
  expect(getCxcInvoiceCfdiEligibility({ ...CASES.cancelado, factura_folio: "" }, reasons)).toEqual({
    kind: "blocked",
    reason: "cancelado null",
  });
});

test("cobro: mismas decisiones con sus textos", () => {
  expect(getCxcCobroEligibility(CASES.vigente)).toEqual({ kind: "cobrable" });
  expect(getCxcCobroEligibility(CASES.cancelado)).toEqual({
    kind: "blocked",
    reason: "La factura F-10 tiene su CFDI cancelado ante el SAT: no admite cobros.",
  });
  expect(getCxcCobroEligibility(CASES.solicitada)).toEqual({
    kind: "blocked",
    reason:
      "La factura F-10 tiene la cancelación de su CFDI pendiente de que el receptor la acepte: no admite cobros.",
  });
  expect(getCxcCobroEligibility(CASES.pendiente)).toEqual({
    kind: "draftOnly",
    reason:
      "La factura F-10 tiene un timbrado pendiente de confirmación: guarda el cobro como borrador y aplícalo cuando se confirme.",
  });
  expect(getCxcCobroEligibility(CASES.respaldo)).toEqual({
    kind: "blocked",
    reason: CXC_NOT_COBRABLE_FALLBACK_REASON,
  });
});

test("nota de crédito: mismas decisiones con sus textos", () => {
  expect(getCreditNoteCxcEligibility(CASES.vigente)).toEqual({ kind: "eligible" });
  expect(getCreditNoteCxcEligibility(CASES.cancelado)).toEqual({
    kind: "blocked",
    reason: "La factura F-10 tiene su CFDI cancelado ante el SAT: no admite notas de crédito.",
  });
  expect(getCreditNoteCxcEligibility(CASES.solicitada)).toEqual({
    kind: "blocked",
    reason:
      "La factura F-10 tiene la cancelación de su CFDI pendiente de que el receptor la acepte: no admite notas de crédito.",
  });
  expect(getCreditNoteCxcEligibility(CASES.pendiente)).toEqual({
    kind: "draftOnly",
    reason:
      "La factura F-10 tiene un timbrado pendiente de confirmación: guarda la nota como borrador y emítela cuando se confirme.",
  });
  expect(getCreditNoteCxcEligibility(CASES.respaldo)).toEqual({
    kind: "blocked",
    reason: CXC_NOT_COBRABLE_FALLBACK_REASON,
  });
});

test("nota de crédito: en el selector solo se deshabilita lo bloqueado (el pendiente se elige para borrador)", () => {
  expect(getCreditNoteCxcSelectionBlockReason(CASES.vigente)).toBeNull();
  expect(getCreditNoteCxcSelectionBlockReason(CASES.pendiente)).toBeNull();
  expect(getCreditNoteCxcSelectionBlockReason(CASES.cancelado)).toContain("no admite notas de crédito");
  expect(getCreditNoteCxcSelectionBlockReason(CASES.solicitada)).toContain("no admite notas de crédito");
  expect(getCreditNoteCxcSelectionBlockReason(CASES.respaldo)).toBe(CXC_NOT_COBRABLE_FALLBACK_REASON);
});

test("nota de crédito: sin los campos nuevos o sin folio", () => {
  expect(getCreditNoteCxcEligibility({ factura_folio: null, estatus: "Parcial", saldo: "5.00" }).kind).toBe(
    "eligible",
  );
  expect(getCreditNoteCxcSelectionBlockReason({ ...CASES.cancelado, factura_folio: null })).toBe(
    "La factura tiene su CFDI cancelado ante el SAT: no admite notas de crédito.",
  );
});
