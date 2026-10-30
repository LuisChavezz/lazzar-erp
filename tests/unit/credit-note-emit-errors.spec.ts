import { expect, test } from "@playwright/test";
import { AxiosError, AxiosHeaders, type AxiosResponse } from "axios";
import {
  getCreateFailureOutcome,
  parseNotaCreditoError,
} from "@/src/features/credit-notes/hooks/useCreateNotaCredito";
import { getEmitRejectedDraftDetail } from "@/src/features/credit-notes/hooks/useEmitirNotaCredito";
import { readStampFailedNota } from "@/src/features/credit-notes/utils/creditNoteErrors";

/**
 * Pruebas unitarias de EC-639: cómo se lee el `400` de una emisión de nota de
 * crédito según nucleo-erp #732 (`cfdi` + `nota_credito: {id, estatus}`) y qué
 * desenlace decide cada camino. Cubre los casos que no se reproducen en vivo
 * (timbrado sin confirmar, `400` sin `nota_credito`).
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
  test("lee nota_credito solo junto a cfdi y no lo suma a los mensajes", () => {
    const parsed = parseNotaCreditoError(stampFailure({ id: "15", estatus: "Cancelada" }));
    expect(parsed.stampFailed).toBe(true);
    expect(parsed.notaCredito).toEqual({ id: 15, estatus: "Cancelada" });
    expect(parsed.messages).toEqual([RECHAZO]);
  });

  test("sin cfdi no hay nota reportada", () => {
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
    );
    expect(outcome?.kind).toBe("pending");
    expect(outcome?.message).toContain("pendiente de confirmación");
    expect(outcome?.message).not.toContain("Timbrar");
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
