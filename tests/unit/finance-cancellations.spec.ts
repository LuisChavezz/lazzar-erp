import { expect, test } from "@playwright/test";
import { QueryClient, type Mutation } from "@tanstack/react-query";
import { AxiosError, AxiosHeaders, type AxiosResponse } from "axios";
import {
  FINANCE_CANCEL_PERMISSION,
  FINANCE_WRITE_PERMISSION_REASON,
  POLIZA_WRITE_PERMISSION_REASON,
  financeCancelPermissionReason,
} from "@/src/constants/financePermissions";
import { financeWriteBlock, getFinanceCancelState } from "@/src/utils/financeWrite";
import { selectMutationRecordId } from "@/src/utils/mutationRecordId";
import { PrecheckError } from "@/src/hooks/useMutationLock";
import { CancelReasonFormSchema } from "@/src/features/document-cancellation/schemas/cancel-reason.schema";
import { classifyFinanceCancelError } from "@/src/features/finance-cancellation/utils/financeCancelAction";
import { cancelInvoiceMotivoError } from "@/src/features/invoicing/hooks/useCancelInvoice";
import { canCancelCobroRep } from "@/src/features/collections/utils/cobroRepCancellation";
import { canOfferCobroCancel } from "@/src/features/collections/utils/cobroCancellation";
import { cobroCancelDialogContent } from "@/src/features/collections/utils/cobroCancelAction";
import { classifyCreditNoteCancelError } from "@/src/features/credit-notes/utils/creditNoteCancelAction";
import { supplierInvoiceRemoval } from "@/src/features/supplier-invoices/utils/supplierInvoiceCancelAction";
import { canCancelMovimiento, isManualMovimiento } from "@/src/features/bank-accounts/utils/movimientoCancelAction";
import { v1_api } from "@/src/api/v1.api";
import { cancelInvoice } from "@/src/features/invoicing/services/actions";
import { cancelCobro, cancelCobroRep } from "@/src/features/collections/services/actions";
import { cancelarNotaCredito } from "@/src/features/credit-notes/services/actions";
import { cancelarPoliza } from "@/src/features/polizas/services/actions";
import { cancelarPago } from "@/src/features/payments/services/actions";
import { cancelSupplierInvoice } from "@/src/features/supplier-invoices/services/actions";
import { cancelarConciliacion } from "@/src/features/bank-reconciliations/services/actions";
import { cancelMovimientoBancario } from "@/src/features/bank-accounts/services/actions";

/**
 * EC-950: cancelaciones con motivo en Finanzas y Contabilidad (nucleo-erp#1356,
 * EC-971). Permisos, cuerpos de las peticiones (con `v1_api` sustituido), la
 * clasificación de errores y las reglas puras de qué se ofrece.
 */

const httpError = (status: number, data: unknown): AxiosError => {
  const config = { headers: new AxiosHeaders() };
  const response = { status, statusText: "", headers: {}, config, data } as AxiosResponse;
  return new AxiosError("Request failed", "ERR_BAD_REQUEST", config, undefined, response);
};

const MOTIVO_400 = { motivo: "Indica el motivo de la cancelación." };

const user = (permissions: string[]) => ({ role: "user", permissions });
const contabilidad = user(["R-CONTABILIDAD", "E-FIN-FACTURAS"]);
const conCancelar = (...codes: string[]) => user(["R-CONTABILIDAD", "E-FIN-FACTURAS", ...codes]);
const admin = { role: "admin", permissions: [] };

test.describe("permisos de cancelación", () => {
  test("los códigos son los del backend", () => {
    expect(FINANCE_CANCEL_PERMISSION).toEqual({
      polizas: "CANCELAR-FIN-POLIZAS",
      cobros: "CANCELAR-FIN-COBROS",
      pagos: "CANCELAR-FIN-PAGOS",
      bancos: "CANCELAR-FIN-BANCOS",
    });
    expect(financeCancelPermissionReason("CANCELAR-FIN-POLIZAS")).toBe(
      "No tienes permiso para cancelar este documento (CANCELAR-FIN-POLIZAS).",
    );
  });

  test("pide E-FIN-FACTURAS y el CANCELAR-FIN-* del documento; el motivo es el permiso que falta", () => {
    const sinNada = getFinanceCancelState(user(["R-CONTABILIDAD"]), "authenticated", "CANCELAR-FIN-POLIZAS", POLIZA_WRITE_PERMISSION_REASON);
    expect(sinNada).toEqual({ canWrite: false, isSessionLoading: false, reason: POLIZA_WRITE_PERMISSION_REASON });

    const soloEscritura = getFinanceCancelState(contabilidad, "authenticated", "CANCELAR-FIN-POLIZAS");
    expect(soloEscritura.canWrite).toBe(false);
    expect(soloEscritura.reason).toBe(financeCancelPermissionReason("CANCELAR-FIN-POLIZAS"));
    expect(financeWriteBlock(soloEscritura, soloEscritura.reason)).toEqual({
      disabled: true,
      description: financeCancelPermissionReason("CANCELAR-FIN-POLIZAS"),
    });

    expect(getFinanceCancelState(conCancelar("CANCELAR-FIN-POLIZAS"), "authenticated", "CANCELAR-FIN-POLIZAS").canWrite).toBe(true);
    // Un CANCELAR de otro tipo no basta.
    expect(getFinanceCancelState(conCancelar("CANCELAR-FIN-PAGOS"), "authenticated", "CANCELAR-FIN-POLIZAS").canWrite).toBe(false);
  });

  test("el admin pasa; mientras la sesión carga falla cerrado sin afirmar que falta el permiso", () => {
    expect(getFinanceCancelState(admin, "authenticated", "CANCELAR-FIN-BANCOS").canWrite).toBe(true);
    const loading = getFinanceCancelState(admin, "loading", "CANCELAR-FIN-BANCOS");
    expect(loading.canWrite).toBe(false);
    expect(financeWriteBlock(loading, loading.reason).description).toBeUndefined();
    expect(getFinanceCancelState(user([]), "authenticated", "CANCELAR-FIN-BANCOS").reason).toBe(
      FINANCE_WRITE_PERMISSION_REASON,
    );
  });

  test("REP y cobro piden CANCELAR-FIN-COBROS además de E-FIN-FACTURAS", () => {
    const cobroConRep = {
      rep_uuid: "UUID-1",
      rep_facturama_id: "fac-1",
      rep_pendiente: false,
      rep_cancelacion_solicitada: false,
      rep_cancelacion_motivo: null,
      rep_cancelacion_en_curso_desde: null,
    } as unknown as Parameters<typeof canCancelCobroRep>[0];
    expect(canCancelCobroRep(cobroConRep, contabilidad)).toBe(false);
    expect(canCancelCobroRep(cobroConRep, conCancelar("CANCELAR-FIN-COBROS"))).toBe(true);
    expect(canCancelCobroRep(cobroConRep, admin)).toBe(true);

    expect(canOfferCobroCancel({ estatus: "Aplicado" }, contabilidad)).toBe(false);
    expect(canOfferCobroCancel({ estatus: "Aplicado" }, conCancelar("CANCELAR-FIN-COBROS"))).toBe(true);
    expect(canOfferCobroCancel({ estatus: "Cancelado" }, conCancelar("CANCELAR-FIN-COBROS"))).toBe(false);
  });
});

test.describe("el motivo viaja en cada petición", () => {
  interface Sent {
    method: "post" | "delete";
    url: string;
    data: unknown;
    params?: unknown;
  }

  /** Sustituye `v1_api` y devuelve lo que se mandó. */
  const capture = async (call: () => Promise<unknown>): Promise<Sent> => {
    const originalPost = v1_api.post;
    let sent: Sent | null = null;
    v1_api.post = (async (url: string, data?: unknown, config?: { params?: unknown }) => {
      sent = { method: "post", url, data, params: config?.params };
      return { data: { id: 1 } };
    }) as typeof v1_api.post;
    try {
      await call();
    } finally {
      v1_api.post = originalPost;
    }
    if (!sent) throw new Error("No hubo petición");
    return sent;
  };

  test("factura: motivo obligatorio junto a motivo_sat; sin CFDI vigente, solo motivo", async () => {
    const conSat = await capture(() => cancelInvoice({ id: 7, motivo: "Error de captura", motivoSat: "02" }));
    expect(conSat.url).toBe("/finanzas/facturas/7/cancelar/");
    expect(conSat.data).toEqual({ motivo: "Error de captura", motivo_sat: "02" });
    const sinSat = await capture(() => cancelInvoice({ id: 7, motivo: "Borrador duplicado", motivoSat: null }));
    expect(sinSat.data).toEqual({ motivo: "Borrador duplicado" });
  });

  test("REP: motivo obligatorio junto a motivo_sat", async () => {
    const sent = await capture(() => cancelCobroRep({ id: 3, motivoSat: "03", motivo: "Se timbró de más" }));
    expect(sent.url).toBe("/finanzas/cobros/3/cancelar-rep/");
    expect(sent.data).toEqual({ motivo: "Se timbró de más", motivo_sat: "03" });
  });

  test("NC: el motivo va en el BODY, nunca en la URL (`?motivo=` es su filtro y da 404)", async () => {
    const sent = await capture(() => cancelarNotaCredito(9, "Devolución anulada"));
    expect(sent.url).toBe("/finanzas/notas-credito/9/cancelar/");
    expect(sent.url).not.toContain("?");
    expect(sent.params).toBeUndefined();
    expect(sent.data).toEqual({ motivo: "Devolución anulada" });
  });

  test("cobro, póliza, pago, factura de proveedor, conciliación y movimiento: POST cancelar/ con { motivo }", async () => {
    const cases: [() => Promise<unknown>, string][] = [
      [() => cancelCobro(1, "m"), "/finanzas/cobros/1/cancelar/"],
      [() => cancelarPoliza(2, "m"), "/finanzas/polizas/2/cancelar/"],
      [() => cancelarPago(3, "m"), "/finanzas/pagos/3/cancelar/"],
      [() => cancelSupplierInvoice(4, "m"), "/finanzas/facturas-proveedor/4/cancelar/"],
      [() => cancelarConciliacion(5, "m"), "/finanzas/conciliaciones-bancarias/5/cancelar/"],
      [() => cancelMovimientoBancario(6, "m"), "/finanzas/movimientos-bancarios/6/cancelar/"],
    ];
    for (const [call, url] of cases) {
      const sent = await capture(call);
      expect(sent.url).toBe(url);
      expect(sent.data).toEqual({ motivo: "m" });
    }
  });
});

test.describe("motivo obligatorio en los diálogos de factura y REP", () => {
  test("usan el schema del diálogo genérico: vacío o de solo espacios no pasa; 500 code points sí, 501 no", () => {
    expect(CancelReasonFormSchema.safeParse({ motivo: "" }).success).toBe(false);
    expect(CancelReasonFormSchema.safeParse({ motivo: "   " }).success).toBe(false);
    expect(CancelReasonFormSchema.safeParse({ motivo: "x".repeat(500) }).success).toBe(true);
    expect(CancelReasonFormSchema.safeParse({ motivo: "x".repeat(501) }).success).toBe(false);
    expect(CancelReasonFormSchema.parse({ motivo: "  Error de captura  " }).motivo).toBe("Error de captura");
  });

  test("el 400 de motivo va bajo el campo; el de motivo_sat o cfdi, no", () => {
    expect(cancelInvoiceMotivoError(httpError(400, MOTIVO_400))).toBe(MOTIVO_400.motivo);
    expect(cancelInvoiceMotivoError(httpError(400, { motivo_sat: "Motivo inválido." }))).toBeUndefined();
    expect(cancelInvoiceMotivoError(httpError(400, { cfdi: ["Facturama no respondió"] }))).toBeUndefined();
    expect(cancelInvoiceMotivoError(new PrecheckError("ya estaba cancelada"))).toBeUndefined();
  });
});

test.describe("errores de una cancelación de Finanzas", () => {
  const classify = (error: unknown, blockingKeys: string[] = []) =>
    classifyFinanceCancelError(error, { documentLabel: "la póliza", blockingKeys });

  test("motivo bajo el campo, ya cancelado y llaves del documento como bloqueo", () => {
    expect(classify(httpError(400, MOTIVO_400))).toEqual({ kind: "motivo", message: MOTIVO_400.motivo });
    expect(classify(httpError(400, { estatus: "El documento ya está cancelado." }))).toEqual({
      kind: "blocked",
      message: "El documento ya está cancelado.",
    });
    expect(classify(httpError(400, { rep: ["El cobro tiene REP timbrado."] }), ["rep"])).toEqual({
      kind: "blocked",
      message: "El cobro tiene REP timbrado.",
    });
  });

  test("403 con su detail, 409 con su cuerpo (lista o detail) tal cual", () => {
    const detail = "No tienes permiso para cancelar este documento (CANCELAR-FIN-POLIZAS).";
    expect(classify(httpError(403, { detail }))).toEqual({ kind: "forbidden", message: detail });
    const conflicto = "No se puede eliminar en este momento: otra operación está modificando la cuenta por pagar o sus pagos. Intente de nuevo.";
    expect(classify(httpError(409, [conflicto]))).toEqual({ kind: "other", message: conflicto });
    expect(classify(httpError(409, { detail: "No se puede eliminar porque tiene pagos ligados." })).message).toBe(
      "No se puede eliminar porque tiene pagos ligados.",
    );
  });

  test("el precheck bloquea; un corte sin respuesta se puede reintentar tras releer", () => {
    expect(classify(new PrecheckError("La póliza cambió."))).toEqual({ kind: "blocked", message: "La póliza cambió." });
    const timeout = new AxiosError("timeout", AxiosError.ETIMEDOUT, { headers: new AxiosHeaders() });
    expect(classify(timeout).kind).toBe("retryable");
    expect(classify(timeout).message).toContain("la póliza pudo haberse cancelado");
  });

  test("cobro: el 400 rep cierra con el mensaje del backend; nota de crédito: conserva su texto de cfdi", () => {
    const action = cobroCancelDialogContent(new QueryClient(), { id: 1, folio: "COB-1", estatus: "Aplicado" }).action;
    expect(action.classifyError(httpError(400, { rep: ["Cancela el REP primero."] }))).toEqual({
      kind: "blocked",
      message: "Cancela el REP primero.",
    });
    expect(action.mutationKey).toEqual(["cancel-cobro", 1]);
    const cfdi = "La nota tiene CFDI de egreso timbrado; cancélalo en Facturama antes de cancelarla aquí.";
    expect(classifyCreditNoteCancelError(httpError(400, { cfdi: [cfdi] }))).toEqual({ kind: "blocked", message: cfdi });
    expect(classifyCreditNoteCancelError(httpError(400, MOTIVO_400)).kind).toBe("motivo");
  });
});

test.describe("qué se ofrece", () => {
  test("factura de proveedor: Borrador se elimina, Registrada se cancela, Cancelada nada", () => {
    expect(supplierInvoiceRemoval("Borrador")).toBe("delete");
    expect(supplierInvoiceRemoval("Registrada")).toBe("cancel");
    expect(supplierInvoiceRemoval("Cancelada")).toBeNull();
  });

  test("movimiento bancario: solo el manual (sin cobro ni pago) y no cancelado", () => {
    const manual = { cobro_id: null, pago_id: null, estatus: "Pendiente" as const };
    expect(isManualMovimiento(manual)).toBe(true);
    expect(canCancelMovimiento(manual)).toBe(true);
    expect(canCancelMovimiento({ ...manual, estatus: "Conciliado" })).toBe(true);
    expect(canCancelMovimiento({ ...manual, estatus: "Cancelado" })).toBe(false);
    expect(canCancelMovimiento({ ...manual, cobro_id: 12 })).toBe(false);
    expect(canCancelMovimiento({ ...manual, pago_id: 8 })).toBe(false);
  });

  test("las filas en vuelo leen el id de la llave cuando las variables son el motivo", () => {
    const mutation = (variables: unknown, mutationKey: unknown[]) =>
      ({ state: { variables }, options: { mutationKey } }) as unknown as Mutation<unknown, Error, unknown, unknown>;
    expect(selectMutationRecordId(mutation("Motivo", ["cancelar-poliza", 42]))).toBe(42);
    expect(selectMutationRecordId(mutation(7, ["delete-poliza"]))).toBe(7);
    expect(selectMutationRecordId(mutation({ id: 9 }, ["update-supplier-invoice"]))).toBe(9);
  });
});
