import { expect, test } from "@playwright/test";
import { AxiosError, AxiosHeaders, type AxiosResponse } from "axios";
import { QueryClient } from "@tanstack/react-query";
import {
  getCreateFailureOutcome,
  parseNotaCreditoError,
} from "@/src/features/credit-notes/hooks/useCreateNotaCredito";
import {
  getEmitFailureOutcome,
  getEmitRejectedDraftDetail,
} from "@/src/features/credit-notes/hooks/useEmitirNotaCredito";
import { checkEmittedNotaStamp } from "@/src/features/credit-notes/hooks/checkEmittedNotaStamp";
import type { NotaCredito } from "@/src/features/credit-notes/interfaces/credit-note.interface";
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
 * Pruebas unitarias de EC-709: "Conciliar con Facturama" (permiso, mensajes de
 * error de `conciliar-cfdi/`) y cómo se clasifica una emisión de nota de crédito
 * que falla DESPUÉS de guardar, por los datos del `400` y no por el estatus.
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

test.describe("getEmitFailureOutcome (emitir desde el listado)", () => {
  const ID = 21;

  test("nota Emitida con o sin cfdi se relee (emitted)", () => {
    const conCfdi = parseNotaCreditoError(
      httpError(400, { cfdi: ["Facturama no confirmó."], nota_credito: { id: ID, estatus: "Emitida" } }),
    );
    const poliza = parseNotaCreditoError(
      httpError(400, { poliza: ["Sin cuenta contable."], nota_credito: { id: ID, estatus: "Emitida" } }),
    );
    expect(getEmitFailureOutcome(conCfdi, ID, "#21")).toEqual({ kind: "emitted" });
    expect(getEmitFailureOutcome(poliza, ID, "#21")).toEqual({ kind: "emitted" });
  });

  test("Borrador con cfdi: Facturama rechazó", () => {
    const outcome = getEmitFailureOutcome(
      parseNotaCreditoError(httpError(400, { cfdi: ["Facturama rechazó."], nota_credito: { id: ID, estatus: "Borrador" } })),
      ID,
      "#21",
    );
    expect(outcome?.kind).toBe("rejected-to-draft");
    if (outcome?.kind !== "rejected-to-draft") return;
    expect(outcome.toast).toContain("Facturama rechazó");
    expect(outcome.detail).toContain("Facturama rechazó.");
  });

  test("Borrador sin cfdi (#751) va al mismo flujo sin culpar a Facturama", () => {
    const parsed = parseNotaCreditoError(
      httpError(400, {
        factura: ["La factura está cancelada o su cancelación está en proceso."],
        nota_credito: { id: ID, estatus: "Borrador" },
      }),
    );
    const outcome = getEmitFailureOutcome(parsed, ID, "#21");
    expect(outcome?.kind).toBe("rejected-to-draft");
    if (outcome?.kind !== "rejected-to-draft") return;
    expect(outcome.toast).not.toContain("Facturama");
    expect(outcome.detail).toContain("sigue en borrador");
    expect(outcome.detail).toContain("La factura está cancelada o su cancelación está en proceso.");
    expect(getEmitRejectedDraftDetail(parsed, ID)).toBe(outcome.detail);
  });

  test("cfdi sin nota_credito de esta nota no afirma nada", () => {
    const sinNota = parseNotaCreditoError(httpError(400, { cfdi: ["Falló."] }));
    const otraNota = parseNotaCreditoError(
      httpError(400, { cfdi: ["Falló."], nota_credito: { id: 99, estatus: "Emitida" } }),
    );
    expect(getEmitFailureOutcome(sinNota, ID, "#21")?.kind).toBe("stamp-unknown");
    expect(getEmitFailureOutcome(otraNota, ID, "#21")?.kind).toBe("stamp-unknown");
  });

  test("un error de validación común no tiene desenlace propio", () => {
    expect(getEmitFailureOutcome(parseNotaCreditoError(httpError(400, { total: ["Excede el saldo."] })), ID, "#21")).toBeNull();
  });
});

test.describe("getCreateFailureOutcome con la nota Cancelada sin cfdi (#751)", () => {
  test("dice que se registró y quedó cancelada, con el motivo del backend", () => {
    const outcome = getCreateFailureOutcome(
      parseNotaCreditoError(
        httpError(400, {
          factura: ["La factura está dada de baja."],
          nota_credito: { id: "30", estatus: "Cancelada" },
        }),
      ),
      { estatus: "Emitida", folio: "NC-30" },
    );
    expect(outcome?.kind).toBe("cancelled");
    expect(outcome?.message).toContain("NC-30 se registró");
    expect(outcome?.message).toContain("quedó cancelada");
    expect(outcome?.message).toContain("La factura está dada de baja.");
    expect(outcome?.message).not.toContain("Facturama rechazó");
  });
});

test.describe("checkEmittedNotaStamp", () => {
  const queryClient = new QueryClient();
  const reread = (cfdi_pendiente: boolean) => async () =>
    ({ id: 1, cfdi_pendiente }) as unknown as NotaCredito;

  test("decide por cfdi_pendiente de la nota releída", async () => {
    expect(await checkEmittedNotaStamp(queryClient, 1, reread(true))).toBe("pending");
    expect(await checkEmittedNotaStamp(queryClient, 1, reread(false))).toBe("not-pending");
  });

  test("si no se puede releer la nota, no afirma nada (unknown)", async () => {
    const failing = async (): Promise<NotaCredito> => {
      throw new Error("No se pudo consultar la nota de crédito.");
    };
    expect(await checkEmittedNotaStamp(queryClient, 1, failing)).toBe("unknown");
  });
});
