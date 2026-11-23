import { expect, test } from "@playwright/test";
import {
  CXC_NOT_COBRABLE_FALLBACK_REASON,
  getCxcApplyBlockReason,
  getCxcCobroEligibility,
  getCxcSelectionBlockReason,
  summarizeApplyBlockReasons,
} from "@/src/features/collections/utils/cxcCobroEligibility";

/**
 * EC-928: qué admite una CxC en un cobro según el CFDI de su factura. La misma
 * regla alimenta el selector, el formulario y el "Aplicar" del detalle.
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

test("una CxC vigente es cobrable", () => {
  expect(getCxcCobroEligibility(base)).toEqual({ kind: "cobrable" });
  expect(getCxcSelectionBlockReason(base)).toBeNull();
  expect(getCxcApplyBlockReason(base)).toBeNull();
});

test("CFDI cancelado: bloqueada con su motivo", () => {
  const cuenta = { ...base, cobrable: false, factura_cfdi_cancelado: true };
  expect(getCxcCobroEligibility(cuenta)).toEqual({
    kind: "blocked",
    reason: "La factura F-10 tiene su CFDI cancelado ante el SAT: no admite cobros.",
  });
  expect(getCxcSelectionBlockReason(cuenta)).not.toBeNull();
  expect(getCxcApplyBlockReason(cuenta)).not.toBeNull();
});

test("cancelación solicitada: bloqueada con su motivo", () => {
  const cuenta = { ...base, cobrable: false, factura_cfdi_cancelacion_solicitada: true };
  expect(getCxcCobroEligibility(cuenta)).toEqual({
    kind: "blocked",
    reason:
      "La factura F-10 tiene la cancelación de su CFDI pendiente de que el receptor la acepte: no admite cobros.",
  });
});

test("timbrado pendiente: se elige, solo para borrador", () => {
  const cuenta = { ...base, cobrable: false, factura_cfdi_pendiente: true };
  const eligibility = getCxcCobroEligibility(cuenta);
  expect(eligibility.kind).toBe("draftOnly");
  expect(getCxcSelectionBlockReason(cuenta)).toBeNull();
  expect(getCxcApplyBlockReason(cuenta)).toBe(
    "La factura F-10 tiene un timbrado pendiente de confirmación: guarda el cobro como borrador y aplícalo cuando se confirme.",
  );
});

test("cobrable false sin campo que lo explique: respaldo", () => {
  const cuenta = { ...base, cobrable: false };
  expect(getCxcCobroEligibility(cuenta)).toEqual({ kind: "blocked", reason: CXC_NOT_COBRABLE_FALLBACK_REASON });
});

test("CxC Cancelada: respaldo aunque no traiga los campos", () => {
  const cuenta = { factura_folio: "F-10", saldo: "100.00", estatus: "Cancelada" as const };
  expect(getCxcSelectionBlockReason(cuenta)).toBe(CXC_NOT_COBRABLE_FALLBACK_REASON);
});

test("prioridad: cancelado > cancelación solicitada > pendiente > respaldo", () => {
  const todos = {
    ...base,
    cobrable: false,
    factura_cfdi_cancelado: true,
    factura_cfdi_cancelacion_solicitada: true,
    factura_cfdi_pendiente: true,
  };
  expect(getCxcSelectionBlockReason(todos)).toContain("CFDI cancelado ante el SAT");
  expect(getCxcSelectionBlockReason({ ...todos, factura_cfdi_cancelado: false })).toContain(
    "pendiente de que el receptor la acepte",
  );
  expect(
    getCxcCobroEligibility({ ...todos, factura_cfdi_cancelado: false, factura_cfdi_cancelacion_solicitada: false })
      .kind,
  ).toBe("draftOnly");
  expect(
    getCxcCobroEligibility({ ...todos, estatus: "Cancelada", factura_cfdi_cancelado: false, factura_cfdi_cancelacion_solicitada: false })
      .kind,
  ).toBe("draftOnly");
});

test("el saldo en 0 no se presenta como cancelada (lo cubre la regla de saldo)", () => {
  expect(getCxcCobroEligibility({ ...base, cobrable: false, saldo: "0.00" }).kind).toBe("cobrable");
  expect(getCxcCobroEligibility({ ...base, cobrable: false, estatus: "Pagada", saldo: "0.00" }).kind).toBe(
    "cobrable",
  );
});

test("sin los campos nuevos, la CxC se trata como antes", () => {
  expect(getCxcCobroEligibility({ factura_folio: null, estatus: "Parcial", saldo: "5.00" }).kind).toBe("cobrable");
});

test("sin folio, el motivo habla de «La factura»", () => {
  expect(getCxcApplyBlockReason({ ...base, factura_folio: null, factura_cfdi_cancelado: true })).toBe(
    "La factura tiene su CFDI cancelado ante el SAT: no admite cobros.",
  );
});

test("resumen del bloqueo de aplicar: ninguno, uno o varios", () => {
  expect(summarizeApplyBlockReasons([null, null])).toBeNull();
  expect(summarizeApplyBlockReasons([null, "Motivo A"])).toBe("Motivo A");
  expect(summarizeApplyBlockReasons(["Motivo A", null, "Motivo B"])).toBe(
    "2 facturas del cobro no admiten aplicarlo: revisa el aviso de cada línea. Puedes guardarlo como borrador.",
  );
});
