import { expect, test } from "@playwright/test";
import { AxiosError, AxiosHeaders, type AxiosResponse } from "axios";
import {
  canReconcileCreditNoteCfdi,
  creditNoteStampPendingHint,
} from "@/src/features/credit-notes/utils/creditNoteStamping";
import { reconcileNotaCreditoCfdiErrorMessage } from "@/src/features/credit-notes/utils/creditNoteErrors";
import {
  canReconcileInvoiceCfdi,
  reconcileInvoiceCfdiErrorMessage,
} from "@/src/features/invoicing/utils/invoiceStamping";

/**
 * Pruebas unitarias de EC-709: "Conciliar con Facturama" (permiso, pista del
 * pendiente y mensajes de error de `conciliar-cfdi/`). La clasificación de una
 * emisión fallida la cubre `credit-note-emit-errors.spec.ts` (EC-707).
 */

const httpError = (status: number, data: unknown): AxiosError => {
  const config = { headers: new AxiosHeaders() };
  const response = { status, statusText: "", headers: {}, config, data } as AxiosResponse;
  return new AxiosError("Request failed", "ERR_BAD_REQUEST", config, undefined, response);
};

const conEscritura = { role: "user", permissions: ["R-CONTABILIDAD", "E-FIN-FACTURAS"] };
const soloLectura = { role: "user", permissions: ["R-CONTABILIDAD"] };
const admin = { role: "admin", permissions: [] };

test.describe("¿se ofrece Conciliar con Facturama?", () => {
  test("solo con el timbrado pendiente y E-FIN-FACTURAS (o admin)", () => {
    for (const can of [canReconcileInvoiceCfdi, canReconcileCreditNoteCfdi]) {
      expect(can({ cfdi_pendiente: true }, conEscritura)).toBe(true);
      expect(can({ cfdi_pendiente: true }, admin)).toBe(true);
      expect(can({ cfdi_pendiente: true }, soloLectura)).toBe(false);
      expect(can({ cfdi_pendiente: true }, null)).toBe(false);
      expect(can({ cfdi_pendiente: false }, conEscritura)).toBe(false);
    }
  });

  test("la pista del pendiente no le pide conciliar a quien no puede", () => {
    expect(creditNoteStampPendingHint(true)).toContain("Concílialo");
    expect(creditNoteStampPendingHint(false)).not.toContain("Concílialo");
    expect(creditNoteStampPendingHint(false)).toContain("permiso de facturación");
  });
});

test.describe("mensaje de error de conciliar-cfdi/", () => {
  const RECIENTE = "El timbrado es muy reciente; espera un minuto y vuelve a conciliar.";

  test("muestra el motivo del backend bajo cfdi tal cual", () => {
    const error = httpError(400, { cfdi: [RECIENTE] });
    expect(reconcileInvoiceCfdiErrorMessage(error)).toBe(RECIENTE);
    expect(reconcileNotaCreditoCfdiErrorMessage(error)).toBe(RECIENTE);
  });

  test("un 403 muestra su detail", () => {
    const error = httpError(403, { detail: "No tienes permiso para timbrar facturas." });
    expect(reconcileInvoiceCfdiErrorMessage(error)).toBe("No tienes permiso para timbrar facturas.");
    expect(reconcileNotaCreditoCfdiErrorMessage(error)).toBe("No tienes permiso para timbrar facturas.");
  });

  test("la nota sin respuesta del servidor no muestra el cuerpo", () => {
    const error = httpError(504, "<html>Gateway Timeout</html>");
    expect(reconcileNotaCreditoCfdiErrorMessage(error)).toContain("No se pudo confirmar la conciliación");
  });
});
