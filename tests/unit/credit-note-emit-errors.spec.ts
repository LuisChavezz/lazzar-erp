import { expect, test } from "@playwright/test";
import { AxiosError, AxiosHeaders, type AxiosResponse } from "axios";
import { QueryClient } from "@tanstack/react-query";
import { invalidateCreditNoteQueries } from "@/src/features/credit-notes/hooks/invalidateCreditNoteQueries";
import {
  getCreateFailureOutcome,
  parseNotaCreditoError,
} from "@/src/features/credit-notes/hooks/useCreateNotaCredito";
import {
  getEmitRejectedDraftDetail,
  getEmitReportedNotaMessage,
} from "@/src/features/credit-notes/hooks/useEmitirNotaCredito";
import {
  creditNoteCreateRevertedMessage,
  creditNoteEmitRevertedDetail,
  creditNoteEmitRevertedMessage,
  readStampFailedNota,
} from "@/src/features/credit-notes/utils/creditNoteErrors";
import {
  CREDIT_NOTE_EMIT_STAMP_WARNING,
  getInvoiceEmitPrecheckReason,
  getInvoiceUnstampedEmitWarning,
  getRelatedInvoiceEmitBlockReason,
} from "@/src/features/credit-notes/utils/creditNoteStamping";

/**
 * Pruebas unitarias de EC-639: cómo se lee el `400` de una emisión de nota de
 * crédito según nucleo-erp #732 (`cfdi` + `nota_credito: {id, estatus}`) y qué
 * desenlace decide cada camino. Cubre los casos que no se reproducen en vivo
 * (timbrado sin confirmar, `400` sin `nota_credito`) y, desde EC-707, los `400`
 * de #848 que traen `nota_credito` SIN `cfdi` (póliza tras timbrar, #749;
 * segundo `preparar` fallido, #751).
 */

const httpError = (status: number, data: unknown): AxiosError => {
  const config = { headers: new AxiosHeaders() };
  const response = { status, statusText: "", headers: {}, config, data } as AxiosResponse;
  return new AxiosError("Request failed", "ERR_BAD_REQUEST", config, undefined, response);
};

const RECHAZO = "Facturama rechazó el CFDI: Base por Rate debe ser igual al Total.";
const SIN_CONFIRMAR = "Facturama no confirmó el CFDI (timeout).";

const stampFailure = (notaCredito?: unknown) =>
  httpError(400, {
    cfdi: [notaCredito ? RECHAZO : "No se puede timbrar la nota. La factura F-1 no está timbrada."],
    ...(notaCredito === undefined ? {} : { nota_credito: notaCredito }),
  });

/**
 * Formas REALES de `TimbradoNotaCreditoFallido` (nucleo-erp #848) sin `cfdi`: el
 * `ErrorDeNegocio` del servicio llega con su llave y un string (no una lista), y
 * `nota_credito.id` como número (#750).
 */
const POLIZA = "La póliza de la nota no cuadra: cargos 116.00, abonos 100.00.";
const FACTURA_CANCELADA = "La factura está cancelada o su cancelación está en proceso.";
const polizaTrasTimbre = () =>
  httpError(400, { poliza: POLIZA, nota_credito: { id: 16, estatus: "Emitida" } });
const segundoPrepararFallido = (estatus: "Cancelada" | "Borrador", id = 17) =>
  httpError(400, { factura: FACTURA_CANCELADA, nota_credito: { id, estatus } });

/** Nota fresca tras un `400` con la nota `Emitida`. */
const timbrada = { estatus: "Emitida" as const, cfdi_uuid: "AAAA-1111", cfdi_pendiente: false };
const pendiente = { estatus: "Emitida" as const, cfdi_uuid: null, cfdi_pendiente: true };

test.describe("readStampFailedNota", () => {
  test("normaliza el id que DRF manda como string", () => {
    expect(readStampFailedNota({ id: "15", estatus: "Cancelada" })).toEqual({
      id: 15,
      estatus: "Cancelada",
    });
  });

  test("acepta un id numérico", () => {
    expect(readStampFailedNota({ id: 7, estatus: "Borrador" })).toEqual({ id: 7, estatus: "Borrador" });
  });

  test("descarta ids inválidos y estatus desconocidos", () => {
    expect(readStampFailedNota({ id: "abc", estatus: "Borrador" })).toBeUndefined();
    expect(readStampFailedNota({ id: "", estatus: "Borrador" })).toBeUndefined();
    expect(readStampFailedNota({ id: "0", estatus: "Borrador" })).toBeUndefined();
    expect(readStampFailedNota({ id: "1.5", estatus: "Borrador" })).toBeUndefined();
    expect(readStampFailedNota({ id: "3", estatus: "Pagada" })).toBeUndefined();
    expect(readStampFailedNota(undefined)).toBeUndefined();
    expect(readStampFailedNota(["3"])).toBeUndefined();
  });
});

test.describe("parseNotaCreditoError con nota_credito", () => {
  test("lee nota_credito junto a cfdi y no lo suma a los mensajes", () => {
    const parsed = parseNotaCreditoError(stampFailure({ id: "15", estatus: "Cancelada" }));
    expect(parsed.stampFailed).toBe(true);
    expect(parsed.notaCredito).toEqual({ id: 15, estatus: "Cancelada" });
    expect(parsed.messages).toEqual([RECHAZO]);
  });

  test("lee nota_credito SIN cfdi: la póliza falló tras timbrar (#749)", () => {
    const parsed = parseNotaCreditoError(polizaTrasTimbre());
    expect(parsed.stampFailed).toBeUndefined();
    expect(parsed.notaCredito).toEqual({ id: 16, estatus: "Emitida" });
    expect(parsed.messages).toEqual([POLIZA]);
    expect(parsed.formError).toBe(POLIZA);
  });

  test("lee nota_credito SIN cfdi: segundo preparar fallido (#751)", () => {
    const parsed = parseNotaCreditoError(segundoPrepararFallido("Cancelada"));
    expect(parsed.notaCredito).toEqual({ id: 17, estatus: "Cancelada" });
    expect(parsed.fieldErrors.factura).toBe(FACTURA_CANCELADA);
  });

  test("sin nota_credito no hay nota reportada", () => {
    const parsed = parseNotaCreditoError(
      httpError(400, { factura: ["La factura está cancelada o su cancelación está en proceso."] }),
    );
    expect(parsed.stampFailed).toBeUndefined();
    expect(parsed.notaCredito).toBeUndefined();
    expect(parsed.fieldErrors.factura).toBe("La factura está cancelada o su cancelación está en proceso.");
  });
});

test.describe("getCreateFailureOutcome (alta)", () => {
  const emitida = { estatus: "Emitida" as const, folio: "NC-9" };

  test("rechazo con la nota Cancelada desbloquea (cancelled)", () => {
    const outcome = getCreateFailureOutcome(
      parseNotaCreditoError(stampFailure({ id: "15", estatus: "Cancelada" })),
      emitida,
    );
    expect(outcome?.kind).toBe("cancelled");
    expect(outcome?.message).toContain("NC-9 quedó cancelada");
    expect(outcome?.message).toContain(RECHAZO);
  });

  test("sin folio nombra la nota por su id", () => {
    const outcome = getCreateFailureOutcome(
      parseNotaCreditoError(stampFailure({ id: "15", estatus: "Cancelada" })),
      { estatus: "Emitida", folio: null },
    );
    expect(outcome?.message).toContain("#15 quedó cancelada");
  });

  test("timbrado sin confirmar con la nota Emitida cierra el formulario (pending)", () => {
    const outcome = getCreateFailureOutcome(
      parseNotaCreditoError(
        httpError(400, { cfdi: [SIN_CONFIRMAR], nota_credito: { id: "16", estatus: "Emitida" } }),
      ),
      emitida,
      pendiente,
    );
    expect(outcome?.kind).toBe("pending");
    expect(outcome?.message).toContain("pendiente de confirmación");
    expect(outcome?.message).not.toContain("Timbrar");
  });

  test("póliza fallida tras timbrar: la nota existe, el formulario se cierra con su UUID (emitted)", () => {
    const outcome = getCreateFailureOutcome(parseNotaCreditoError(polizaTrasTimbre()), emitida, timbrada);
    expect(outcome?.kind).toBe("emitted");
    expect(outcome?.message).toContain("NC-9 se emitió, se timbró (UUID AAAA-1111)");
    expect(outcome?.message).toContain("No la captures de nuevo");
    expect(outcome?.message).toContain(POLIZA);
  });

  test("nota Emitida cuyo timbre no se pudo consultar queda bloqueada (locked)", () => {
    const outcome = getCreateFailureOutcome(parseNotaCreditoError(polizaTrasTimbre()), emitida, null);
    expect(outcome?.kind).toBe("locked");
    expect(outcome?.message).toContain("no la captures de nuevo");
  });

  test("segundo preparar fallido con la nota Cancelada desbloquea sin culpar a Facturama (#751)", () => {
    const outcome = getCreateFailureOutcome(
      parseNotaCreditoError(segundoPrepararFallido("Cancelada")),
      emitida,
    );
    expect(outcome?.kind).toBe("cancelled");
    expect(outcome?.message).toContain("No se pudo timbrar: la nota NC-9 quedó registrada como cancelada");
    expect(outcome?.message).not.toContain("Facturama rechazó");
    expect(outcome?.message).toContain(FACTURA_CANCELADA);
  });

  test("cfdi sin nota_credito queda bloqueado (locked)", () => {
    const outcome = getCreateFailureOutcome(parseNotaCreditoError(stampFailure()), emitida);
    expect(outcome?.kind).toBe("locked");
  });

  test("un estatus que un alta no produce queda bloqueado", () => {
    const outcome = getCreateFailureOutcome(
      parseNotaCreditoError(stampFailure({ id: "15", estatus: "Borrador" })),
      emitida,
    );
    expect(outcome?.kind).toBe("locked");
  });

  test("sin confirmación o 409 en un alta Emitida queda bloqueado", () => {
    expect(getCreateFailureOutcome(parseNotaCreditoError(httpError(504, "")), emitida)?.kind).toBe(
      "locked",
    );
    expect(
      getCreateFailureOutcome(parseNotaCreditoError(httpError(409, { detail: "x" })), emitida)?.kind,
    ).toBe("locked");
  });

  test("un 400 de validación o un 403 no tienen desenlace especial", () => {
    expect(
      getCreateFailureOutcome(
        parseNotaCreditoError(httpError(400, { total: ["supera el saldo"] })),
        emitida,
      ),
    ).toBeNull();
    expect(
      getCreateFailureOutcome(
        parseNotaCreditoError(
          httpError(403, { detail: "No tienes permiso para timbrar la nota de crédito." }),
        ),
        emitida,
      ),
    ).toBeNull();
  });
});

test.describe("getEmitRejectedDraftDetail (emitir un borrador)", () => {
  test("rechazo con ESTA nota de vuelta en Borrador devuelve el motivo", () => {
    const detail = getEmitRejectedDraftDetail(
      parseNotaCreditoError(stampFailure({ id: "21", estatus: "Borrador" })),
      21,
    );
    expect(detail).toContain("sigue en borrador");
    expect(detail).toContain(RECHAZO);
  });

  test("segundo preparar fallido con ESTA nota en Borrador abre el detalle (#751)", () => {
    const detail = getEmitRejectedDraftDetail(
      parseNotaCreditoError(segundoPrepararFallido("Borrador", 21)),
      21,
    );
    expect(detail).toContain("No se pudo timbrar y la nota sigue en borrador");
    expect(detail).toContain(FACTURA_CANCELADA);
  });

  test("otra nota, otro estatus o sin nota_credito no abren el detalle", () => {
    expect(getEmitRejectedDraftDetail(parseNotaCreditoError(stampFailure({ id: "22", estatus: "Borrador" })), 21)).toBeNull();
    expect(getEmitRejectedDraftDetail(parseNotaCreditoError(stampFailure({ id: "21", estatus: "Emitida" })), 21)).toBeNull();
    expect(getEmitRejectedDraftDetail(parseNotaCreditoError(stampFailure()), 21)).toBeNull();
    expect(
      getEmitRejectedDraftDetail(
        parseNotaCreditoError(httpError(400, { factura: ["La factura está cancelada."] })),
        21,
      ),
    ).toBeNull();
  });
});

test.describe("getEmitReportedNotaMessage (emitir un borrador)", () => {
  test("Emitida pendiente: el aviso de siempre", () => {
    const message = getEmitReportedNotaMessage(
      parseNotaCreditoError(
        httpError(400, { cfdi: [SIN_CONFIRMAR], nota_credito: { id: 21, estatus: "Emitida" } }),
      ),
      21,
      "NC-1",
      pendiente,
    );
    expect(message).toContain("pendiente de confirmación");
  });

  test("Emitida timbrada con la póliza fallida: dice su UUID", () => {
    const message = getEmitReportedNotaMessage(
      parseNotaCreditoError(
        httpError(400, { poliza: POLIZA, nota_credito: { id: 21, estatus: "Emitida" } }),
      ),
      21,
      "NC-1",
      timbrada,
    );
    expect(message).toContain("UUID AAAA-1111");
    expect(message).toContain(POLIZA);
  });

  test("Cancelada: lo dice; Borrador, otra nota o sin nota_credito: null", () => {
    expect(
      getEmitReportedNotaMessage(parseNotaCreditoError(segundoPrepararFallido("Cancelada", 21)), 21, "NC-1", null),
    ).toContain("NC-1 quedó cancelada");
    expect(
      getEmitReportedNotaMessage(parseNotaCreditoError(segundoPrepararFallido("Borrador", 21)), 21, "NC-1", null),
    ).toBeNull();
    expect(
      getEmitReportedNotaMessage(parseNotaCreditoError(segundoPrepararFallido("Cancelada", 22)), 21, "NC-1", null),
    ).toBeNull();
    expect(getEmitReportedNotaMessage(parseNotaCreditoError(stampFailure()), 21, "NC-1", null)).toBeNull();
  });
});

test.describe("factura al emitir (precheck y avisos)", () => {
  const factura = (overrides: Record<string, unknown> = {}) => ({
    folio: "F-1",
    estatus: "Emitida",
    activo: true,
    cfdi_pendiente: false,
    cfdi_uuid: "abc" as string | null,
    ...overrides,
  });

  test("el precheck del listado detiene una factura eliminada o inexistente", () => {
    expect(getInvoiceEmitPrecheckReason("F-1", factura({ activo: false }))).toContain(
      "no está disponible",
    );
    expect(getInvoiceEmitPrecheckReason("F-9", undefined)).toContain("F-9 no está disponible");
  });

  test("el precheck del listado detiene un timbrado pendiente", () => {
    expect(getInvoiceEmitPrecheckReason("F-1", factura({ cfdi_pendiente: true }))).toContain(
      "timbrado pendiente",
    );
  });

  test("el precheck del listado deja pasar cancelada (la rechaza el backend) y sin timbrar", () => {
    expect(getInvoiceEmitPrecheckReason("F-1", factura({ estatus: "Cancelada" }))).toBeNull();
    expect(getInvoiceEmitPrecheckReason("F-1", factura({ cfdi_uuid: null }))).toBeNull();
  });

  test("factura sin timbrar: aviso condicionado, no bloqueo", () => {
    expect(getInvoiceUnstampedEmitWarning(factura({ cfdi_uuid: null }))).toContain(
      "Si la empresa timbra con Facturama",
    );
    expect(getInvoiceUnstampedEmitWarning(factura())).toBeNull();
  });

  test("el formulario bloquea una factura eliminada solo con activo false explícito", () => {
    expect(getRelatedInvoiceEmitBlockReason(factura({ activo: false }))).toContain(
      "no está disponible",
    );
    expect(getRelatedInvoiceEmitBlockReason(factura({ activo: undefined }))).toBeNull();
  });

  test("el aviso de emisión no afirma que siempre se timbra", () => {
    expect(CREDIT_NOTE_EMIT_STAMP_WARNING.startsWith("Si la empresa timbra con Facturama")).toBe(
      true,
    );
  });
});

test.describe("invalidateCreditNoteQueries tras leer la nota fresca", () => {
  test("no invalida el detalle recién leído y sí el resto", async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(["credit-note-detail", 16], { id: 16 });
    queryClient.setQueryData(["credit-note-detail", 17], { id: 17 });
    queryClient.setQueryData(["credit-notes"], []);
    await invalidateCreditNoteQueries(queryClient, "balances", 16);
    const invalidated = (key: unknown[]) => queryClient.getQueryState(key)?.isInvalidated;
    expect(invalidated(["credit-note-detail", 16])).toBe(false);
    expect(invalidated(["credit-note-detail", 17])).toBe(true);
    expect(invalidated(["credit-notes"])).toBe(true);
  });
});

test.describe("avisos de reversión por causa (un solo builder)", () => {
  test("alta revertida: mismo texto que antes para Facturama y para #751", () => {
    expect(creditNoteCreateRevertedMessage("facturama", "NC-1", "m")).toBe(
      "Facturama rechazó el timbrado: la nota NC-1 quedó cancelada y el saldo por cobrar de la factura no cambió. Corrige los datos y vuelve a emitirla; se registrará una nota nueva. Motivo: m",
    );
    expect(creditNoteCreateRevertedMessage("otra", "NC-1", "m")).toBe(
      "No se pudo timbrar: la nota NC-1 quedó registrada como cancelada y el saldo por cobrar de la factura no cambió. Corrige los datos y vuelve a emitirla; se registrará una nota nueva. Motivo: m",
    );
  });

  test("borrador revertido: aviso y detalle según la causa", () => {
    expect(creditNoteEmitRevertedMessage("facturama", "NC-1")).toBe(
      "Facturama rechazó el timbrado: la nota NC-1 sigue en borrador y el saldo por cobrar no cambió. El motivo está en su detalle.",
    );
    expect(creditNoteEmitRevertedMessage("otra", "NC-1")).toBe(
      "No se pudo timbrar: la nota NC-1 sigue en borrador y el saldo por cobrar no cambió. El motivo está en su detalle.",
    );
    expect(creditNoteEmitRevertedDetail("facturama", "m")).toBe(
      "Facturama rechazó el timbrado y la nota sigue en borrador; el saldo por cobrar no cambió. Motivo: m",
    );
    expect(creditNoteEmitRevertedDetail("otra", "m")).toBe(
      "No se pudo timbrar y la nota sigue en borrador; el saldo por cobrar no cambió. Motivo: m",
    );
  });
});

test.describe("qué no repetir según el flujo", () => {
  test("al emitir un borrador no se habla de capturar: no volver a emitir ni sustituir", () => {
    const message = getEmitReportedNotaMessage(
      parseNotaCreditoError(polizaTrasTimbre()),
      16,
      "NC-1",
      timbrada,
    );
    expect(message).not.toContain("captures");
    expect(message).toContain("No vuelvas a emitirla ni registres una nota sustituta");
    expect(
      getEmitReportedNotaMessage(parseNotaCreditoError(polizaTrasTimbre()), 16, "NC-1", null),
    ).toContain("no vuelvas a emitirla ni registres una nota sustituta");
  });

  test("en el alta sigue diciendo que no la capture de nuevo", () => {
    const outcome = getCreateFailureOutcome(
      parseNotaCreditoError(polizaTrasTimbre()),
      { estatus: "Emitida", folio: "NC-9" },
      timbrada,
    );
    expect(outcome?.message).toContain("No la captures de nuevo");
  });
});
