import { expect, test } from "@playwright/test";
import {
  getInvoiceCfdiState,
  getInvoiceCfdiStateLabel,
} from "@/src/features/invoicing/utils/invoiceCfdiState";
import {
  getCreditNoteCfdiState,
  getCreditNoteCfdiStateLabel,
} from "@/src/features/credit-notes/utils/creditNoteCfdiState";

/**
 * Pruebas unitarias de EC-713 sobre el estado del CFDI de facturas y notas de
 * crédito: un solo estado por registro, con su precedencia, para la columna
 * «CFDI» de cada listado.
 */

const flags = {
  cfdi_uuid: null as string | null,
  cfdi_pendiente: false,
  cfdi_cancelado: false,
  cfdi_cancelacion_solicitada: false,
};
const UUID = "0d6f2a1c-1111-4b2a-9c3d-123456789abc";

test.describe("estado del CFDI de una factura", () => {
  test("sin UUID ni pendiente: sin timbrar", () => {
    expect(getInvoiceCfdiState(flags)).toBe("sin_timbrar");
    expect(getInvoiceCfdiStateLabel(flags)).toBe("Sin timbrar");
  });

  test("sin UUID y con pendiente: timbrado pendiente", () => {
    expect(getInvoiceCfdiState({ ...flags, cfdi_pendiente: true })).toBe("timbrado_pendiente");
    expect(getInvoiceCfdiStateLabel({ ...flags, cfdi_pendiente: true })).toBe("Timbrado pendiente");
  });

  test("sin UUID, los flags de cancelación no cuentan", () => {
    expect(
      getInvoiceCfdiState({ ...flags, cfdi_cancelado: true, cfdi_cancelacion_solicitada: true }),
    ).toBe("sin_timbrar");
    expect(
      getInvoiceCfdiState({ ...flags, cfdi_pendiente: true, cfdi_cancelado: true }),
    ).toBe("timbrado_pendiente");
  });

  test("con UUID: timbrada", () => {
    expect(getInvoiceCfdiState({ ...flags, cfdi_uuid: UUID })).toBe("timbrada");
    expect(getInvoiceCfdiStateLabel({ ...flags, cfdi_uuid: UUID })).toBe("Timbrada");
  });

  test("con UUID, el pendiente no gana sobre el UUID", () => {
    expect(getInvoiceCfdiState({ ...flags, cfdi_uuid: UUID, cfdi_pendiente: true })).toBe("timbrada");
  });

  test("con UUID y cancelación solicitada: cancelación solicitada", () => {
    const invoice = { ...flags, cfdi_uuid: UUID, cfdi_cancelacion_solicitada: true };
    expect(getInvoiceCfdiState(invoice)).toBe("cancelacion_solicitada");
    expect(getInvoiceCfdiStateLabel(invoice)).toBe("Cancelación solicitada");
  });

  test("con UUID y cancelado: cancelado ante el SAT, aunque siga la solicitud", () => {
    expect(getInvoiceCfdiState({ ...flags, cfdi_uuid: UUID, cfdi_cancelado: true })).toBe(
      "cancelado_sat",
    );
    expect(
      getInvoiceCfdiState({
        ...flags,
        cfdi_uuid: UUID,
        cfdi_cancelado: true,
        cfdi_cancelacion_solicitada: true,
      }),
    ).toBe("cancelado_sat");
    expect(getInvoiceCfdiStateLabel({ ...flags, cfdi_uuid: UUID, cfdi_cancelado: true })).toBe(
      "Cancelado ante el SAT",
    );
  });

  test("flags ausentes cuentan como false", () => {
    expect(getInvoiceCfdiState({ cfdi_uuid: UUID })).toBe("timbrada");
    expect(getInvoiceCfdiState({})).toBe("sin_timbrar");
  });
});

test.describe("estado del CFDI de una nota de crédito", () => {
  test("sin UUID ni pendiente: sin timbrar", () => {
    expect(getCreditNoteCfdiState({ cfdi_uuid: null, cfdi_pendiente: false })).toBe("sin_timbrar");
    expect(getCreditNoteCfdiStateLabel({ cfdi_uuid: null, cfdi_pendiente: false })).toBe(
      "Sin timbrar",
    );
  });

  test("sin UUID y con pendiente: timbrado pendiente", () => {
    expect(getCreditNoteCfdiState({ cfdi_uuid: null, cfdi_pendiente: true })).toBe(
      "timbrado_pendiente",
    );
  });

  test("con UUID: timbrada, aunque siga marcado el pendiente", () => {
    expect(getCreditNoteCfdiState({ cfdi_uuid: UUID, cfdi_pendiente: false })).toBe("timbrada");
    expect(getCreditNoteCfdiState({ cfdi_uuid: UUID, cfdi_pendiente: true })).toBe("timbrada");
    expect(getCreditNoteCfdiStateLabel({ cfdi_uuid: UUID })).toBe("Timbrada");
  });
});
