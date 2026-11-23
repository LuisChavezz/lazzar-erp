import { expect, test } from "@playwright/test";
import {
  CXC_NOT_COBRABLE_FALLBACK_REASON,
  getCxcInvoiceCfdiEligibility,
  type CxcInvoiceCfdiReasons,
} from "@/src/features/accounts-receivable/utils/cxcInvoiceCfdiEligibility";
import type { MotivoNoCobrable } from "@/src/features/accounts-receivable/interfaces/accounts-receivable.interface";
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
    withCauseLabel: (folio, label, kind) => `${kind} ${folio} ${label}`,
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

test("nota de crédito: sin los campos nuevos, o sin folio (la nombra como el resto del módulo)", () => {
  expect(getCreditNoteCxcEligibility({ factura_folio: null, estatus: "Parcial", saldo: "5.00" }).kind).toBe(
    "eligible",
  );
  expect(getCreditNoteCxcSelectionBlockReason({ ...CASES.cancelado, factura_folio: null })).toBe(
    "La factura relacionada tiene su CFDI cancelado ante el SAT: no admite notas de crédito.",
  );
});

// ── EC-938: la causa exacta del backend (`motivo_no_cobrable`) ──────────────

/** Textos de prueba: dejan ver qué rama eligió el núcleo. */
const TEST_REASONS: CxcInvoiceCfdiReasons = {
  withCauseLabel: (folio, label, kind) => `${kind}|${folio}|${label}`,
  cfdiCancelled: (folio) => `cancelado ${folio}`,
  cancellationRequested: (folio) => `solicitada ${folio}`,
  stampPending: (folio) => `pendiente ${folio}`,
};

/** CxC con motivo; sin `display` explícito, uno de prueba (`undefined` explícito: sin texto). */
const conMotivo = (motivo: MotivoNoCobrable | null, ...display: [string | null | undefined] | []) => ({
  ...base,
  cobrable: motivo === null,
  motivo_no_cobrable: motivo,
  motivo_no_cobrable_display: display.length > 0 ? display[0] : `texto ${motivo}`,
});

test("motivo: cada valor decide su tipo y el texto lleva la causa del backend", () => {
  const blocked: MotivoNoCobrable[] = [
    "CXC_CANCELADA",
    "FACTURA_CANCELADA",
    "CFDI_CANCELADO",
    "CANCELACION_SOLICITADA",
    "CANCELACION_EN_CURSO",
  ];
  for (const motivo of blocked) {
    expect(getCxcInvoiceCfdiEligibility(conMotivo(motivo), TEST_REASONS)).toEqual({
      kind: "blocked",
      reason: `blocked|F-10|texto ${motivo}`,
    });
  }
  expect(getCxcInvoiceCfdiEligibility(conMotivo("CFDI_PENDIENTE"), TEST_REASONS)).toEqual({
    kind: "draftOnly",
    reason: "draftOnly|F-10|texto CFDI_PENDIENTE",
  });
  expect(getCxcInvoiceCfdiEligibility(conMotivo(null, null), TEST_REASONS)).toEqual({ kind: "eligible" });
});

test("motivo: SALDO_CERO no bloquea aquí (lo cubre la regla de saldo)", () => {
  expect(getCxcInvoiceCfdiEligibility({ ...conMotivo("SALDO_CERO"), saldo: "0.00" }, TEST_REASONS)).toEqual({
    kind: "eligible",
  });
});

test("motivo: manda sobre los campos del CFDI cuando no coinciden", () => {
  // Campos de cancelado, motivo pendiente: decide el motivo.
  expect(
    getCxcInvoiceCfdiEligibility({ ...conMotivo("CFDI_PENDIENTE"), factura_cfdi_cancelado: true }, TEST_REASONS).kind,
  ).toBe("draftOnly");
  // Campos de pendiente, sin motivo (cobrable): elegible.
  expect(
    getCxcInvoiceCfdiEligibility({ ...conMotivo(null, null), factura_cfdi_pendiente: true }, TEST_REASONS).kind,
  ).toBe("eligible");
  // CxC Cancelada por estatus, motivo de su factura: bloqueada con ese texto.
  expect(
    getCxcInvoiceCfdiEligibility({ ...conMotivo("FACTURA_CANCELADA"), estatus: "Cancelada" }, TEST_REASONS),
  ).toEqual({ kind: "blocked", reason: "blocked|F-10|texto FACTURA_CANCELADA" });
});

test("motivo sin texto: el de la regla por campos para ese motivo", () => {
  for (const display of [null, undefined, "", "   "]) {
    expect(getCxcInvoiceCfdiEligibility(conMotivo("CFDI_CANCELADO", display), TEST_REASONS)).toEqual({
      kind: "blocked",
      reason: "cancelado F-10",
    });
    expect(getCxcInvoiceCfdiEligibility(conMotivo("CANCELACION_SOLICITADA", display), TEST_REASONS)).toEqual({
      kind: "blocked",
      reason: "solicitada F-10",
    });
    expect(getCxcInvoiceCfdiEligibility(conMotivo("CFDI_PENDIENTE", display), TEST_REASONS)).toEqual({
      kind: "draftOnly",
      reason: "pendiente F-10",
    });
    for (const motivo of ["CXC_CANCELADA", "FACTURA_CANCELADA", "CANCELACION_EN_CURSO"] as const) {
      expect(getCxcInvoiceCfdiEligibility(conMotivo(motivo, display), TEST_REASONS)).toEqual({
        kind: "blocked",
        reason: CXC_NOT_COBRABLE_FALLBACK_REASON,
      });
    }
  }
});

test("sin motivo_no_cobrable (o con un valor desconocido): la regla por campos de siempre", () => {
  // Sin el campo: idéntico a EC-928/929.
  expect(getCxcInvoiceCfdiEligibility(CASES.cancelado, TEST_REASONS)).toEqual({
    kind: "blocked",
    reason: "cancelado F-10",
  });
  expect(getCxcInvoiceCfdiEligibility(CASES.respaldo, TEST_REASONS)).toEqual({
    kind: "blocked",
    reason: CXC_NOT_COBRABLE_FALLBACK_REASON,
  });
  // Un motivo que este front aún no conoce no se lee como "cobrable": el tipo
  // sale de los campos y, sin texto de la causa, también el motivo.
  const desconocido = {
    ...CASES.pendiente,
    motivo_no_cobrable: "OTRA_CAUSA" as unknown as MotivoNoCobrable,
    motivo_no_cobrable_display: null,
  };
  expect(getCxcInvoiceCfdiEligibility(desconocido, TEST_REASONS)).toEqual({
    kind: "draftOnly",
    reason: "pendiente F-10",
  });
});

test("motivo desconocido con texto: el tipo de los campos, el motivo con la causa del backend", () => {
  const desconocido = (cuenta: object, display: string | null) =>
    ({
      ...cuenta,
      motivo_no_cobrable: "CLIENTE_INACTIVO" as unknown as MotivoNoCobrable,
      motivo_no_cobrable_display: display,
    }) as typeof base & { motivo_no_cobrable: MotivoNoCobrable; motivo_no_cobrable_display: string | null };
  // `cobrable: false`, sin campos del CFDI y con saldo: bloqueada con la causa real.
  expect(getCxcInvoiceCfdiEligibility(desconocido(CASES.respaldo, "Cliente dado de baja"), TEST_REASONS)).toEqual({
    kind: "blocked",
    reason: "blocked|F-10|Cliente dado de baja",
  });
  expect(getCxcCobroEligibility(desconocido(CASES.respaldo, "Cliente dado de baja"))).toEqual({
    kind: "blocked",
    reason: "Factura F-10: Cliente dado de baja.",
  });
  // Pendiente por campos: sigue siendo solo borrador, con la causa del backend.
  expect(getCxcInvoiceCfdiEligibility(desconocido(CASES.pendiente, "Otra causa"), TEST_REASONS)).toEqual({
    kind: "draftOnly",
    reason: "draftOnly|F-10|Otra causa",
  });
  // Lo que los campos dejan elegir no se bloquea por traer texto.
  expect(getCxcInvoiceCfdiEligibility(desconocido(CASES.vigente, "Otra causa"), TEST_REASONS)).toEqual({
    kind: "eligible",
  });
});

test("cobro: compone «Factura <folio>: <causa>.» y, si es pendiente, qué hacer", () => {
  expect(getCxcCobroEligibility(conMotivo("CANCELACION_EN_CURSO", "Cancelación del CFDI en curso"))).toEqual({
    kind: "blocked",
    reason: "Factura F-10: Cancelación del CFDI en curso.",
  });
  expect(getCxcCobroEligibility(conMotivo("CFDI_PENDIENTE", "CFDI pendiente de timbrar"))).toEqual({
    kind: "draftOnly",
    reason: "Factura F-10: CFDI pendiente de timbrar. Guarda el cobro como borrador y aplícalo cuando se confirme.",
  });
  expect(getCxcCobroEligibility(conMotivo("CFDI_PENDIENTE", "CFDI pendiente de timbrar"), "savedDraft")).toEqual({
    kind: "draftOnly",
    reason: "Factura F-10: CFDI pendiente de timbrar. Aplica el cobro cuando se confirme.",
  });
  expect(
    getCxcCobroEligibility({ ...conMotivo("FACTURA_CANCELADA", "Factura cancelada"), factura_folio: null }),
  ).toEqual({ kind: "blocked", reason: "Factura: Factura cancelada." });
  expect(getCxcCobroEligibility(conMotivo("SALDO_CERO", "Sin saldo por cobrar"))).toEqual({ kind: "cobrable" });
});

test("nota de crédito: compone «Factura <folio>: <causa>.» y, si es pendiente, qué hacer", () => {
  expect(getCreditNoteCxcEligibility(conMotivo("CFDI_CANCELADO", "CFDI cancelado ante el SAT"))).toEqual({
    kind: "blocked",
    reason: "Factura F-10: CFDI cancelado ante el SAT.",
  });
  expect(getCreditNoteCxcEligibility(conMotivo("CFDI_PENDIENTE", "CFDI pendiente de timbrar"))).toEqual({
    kind: "draftOnly",
    reason: "Factura F-10: CFDI pendiente de timbrar. Guarda la nota como borrador y emítela cuando se confirme.",
  });
  expect(
    getCreditNoteCxcSelectionBlockReason({ ...conMotivo("CXC_CANCELADA", "CxC cancelada"), factura_folio: null }),
  ).toBe("Factura relacionada: CxC cancelada.");
  // El pendiente se elige (solo para borrador).
  expect(getCreditNoteCxcSelectionBlockReason(conMotivo("CFDI_PENDIENTE", "CFDI pendiente de timbrar"))).toBeNull();
});

test("una causa que ya termina en punto no sale con «..» en ningún documento", () => {
  expect(getCxcCobroEligibility(conMotivo("FACTURA_CANCELADA", "Factura cancelada."))).toEqual({
    kind: "blocked",
    reason: "Factura F-10: Factura cancelada.",
  });
  expect(getCreditNoteCxcEligibility(conMotivo("CFDI_PENDIENTE", " CFDI pendiente de timbrar. "))).toEqual({
    kind: "draftOnly",
    reason: "Factura F-10: CFDI pendiente de timbrar. Guarda la nota como borrador y emítela cuando se confirme.",
  });
  // Solo un punto: un texto que es solo «.» cuenta como sin texto.
  expect(getCxcInvoiceCfdiEligibility(conMotivo("CFDI_CANCELADO", "."), TEST_REASONS)).toEqual({
    kind: "blocked",
    reason: "cancelado F-10",
  });
});
