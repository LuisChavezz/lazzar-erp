import { expect, test } from "@playwright/test";
import {
  SAT_CANCEL_MOTIVES,
  formatSatCancelMotive,
  getLockedSatCancelMotive,
  isSatCancelMotive,
  isSatCancelMotiveLockedElsewhere,
  type SatCancelMotive,
} from "@/src/constants/satCancelMotives";
import {
  SAT_CANCEL_MOTIVE_LOCKED_HINT,
  getSatCancelMotiveSelectView,
} from "@/src/components/SatCancelMotiveSelect";
import {
  cancelInvoiceErrorMessage,
  getInvoiceCancelCfdiNotice,
  getInvoiceLockedSatCancelMotive,
  willInvoiceCancelReachSat,
} from "@/src/features/invoicing/utils/invoiceCancellation";
import {
  cancelCobroRepErrorMessage,
  getCobroRepCancelPrecheck,
  getCobroRepLockedSatCancelMotive,
} from "@/src/features/collections/utils/cobroRepCancellation";
import type { CobroActionTrigger } from "@/src/features/collections/hooks/useCobroAction";

/**
 * Pruebas unitarias de EC-808: el catálogo único de motivos SAT de
 * cancelación (02/03) y su guarda de tipo, el motivo FIJO mientras la
 * cancelación está solicitada o tiene un intento en curso, el selector
 * bloqueado (que no se puede producir en vivo en el sandbox) y que los `400`
 * nuevos de EC-806 lleguen legibles.
 */

const UUID = "0d6f2a1c-1111-4b2a-9c3d-123456789abc";

/** Error de Axios con un `400` de DRF (lo único que leen los extractores). */
const drf400 = (data: Record<string, unknown>) => ({ response: { status: 400, data } });

test.describe("catálogo de motivos SAT", () => {
  test("solo ofrece 02 y 03, en ese orden", () => {
    expect(SAT_CANCEL_MOTIVES.map((motive) => motive.value)).toEqual(["02", "03"]);
    expect(formatSatCancelMotive("02")).toBe("02 · Comprobante emitido con errores sin relación");
    expect(formatSatCancelMotive("03")).toBe("03 · No se llevó a cabo la operación");
  });

  test("la guarda acepta solo claves del catálogo", () => {
    expect(isSatCancelMotive("02")).toBe(true);
    expect(isSatCancelMotive("03")).toBe(true);
    for (const value of ["01", "04", "", " 02", "2", 2, null, undefined, {}]) {
      expect(isSatCancelMotive(value)).toBe(false);
    }
  });
});

test.describe("motivo fijo", () => {
  test("sin solicitud ni intento en curso se puede elegir", () => {
    expect(getLockedSatCancelMotive({ requested: false, motive: "03", inFlightSince: null })).toBeNull();
    expect(getLockedSatCancelMotive({ requested: undefined, motive: null, inFlightSince: undefined })).toBeNull();
  });

  test("con la cancelación solicitada queda el motivo guardado", () => {
    expect(getLockedSatCancelMotive({ requested: true, motive: "03", inFlightSince: null })).toBe("03");
  });

  test("solicitada sin motivo guardado cuenta como 02", () => {
    expect(getLockedSatCancelMotive({ requested: true, motive: null, inFlightSince: null })).toBe("02");
    expect(getLockedSatCancelMotive({ requested: true, motive: "", inFlightSince: null })).toBe("02");
  });

  test("un intento en curso o sin respuesta también lo fija", () => {
    expect(
      getLockedSatCancelMotive({ requested: false, motive: "03", inFlightSince: "2026-11-07T10:00:00Z" }),
    ).toBe("03");
  });

  test("un valor fuera del catálogo no se fija (decide el backend)", () => {
    expect(getLockedSatCancelMotive({ requested: true, motive: "01", inFlightSince: null })).toBeNull();
  });

  test("factura: lee los campos del CFDI; el listado no trae la reserva", () => {
    expect(
      getInvoiceLockedSatCancelMotive({ cfdi_cancelacion_solicitada: true, cfdi_cancelacion_motivo: null }),
    ).toBe("02");
    expect(
      getInvoiceLockedSatCancelMotive({
        cfdi_cancelacion_solicitada: false,
        cfdi_cancelacion_motivo: "03",
        cfdi_cancelacion_en_curso_desde: "2026-11-07T10:00:00Z",
      }),
    ).toBe("03");
    expect(
      getInvoiceLockedSatCancelMotive({ cfdi_cancelacion_solicitada: false, cfdi_cancelacion_motivo: "03" }),
    ).toBeNull();
  });

  test("cobro: lee los campos del REP", () => {
    expect(
      getCobroRepLockedSatCancelMotive({
        rep_cancelacion_solicitada: false,
        rep_cancelacion_motivo: "02",
        rep_cancelacion_en_curso_desde: "2026-11-07T10:00:00Z",
      }),
    ).toBe("02");
    expect(
      getCobroRepLockedSatCancelMotive({
        rep_cancelacion_solicitada: true,
        rep_cancelacion_motivo: null,
        rep_cancelacion_en_curso_desde: null,
      }),
    ).toBe("02");
    expect(
      getCobroRepLockedSatCancelMotive({
        rep_cancelacion_solicitada: false,
        rep_cancelacion_motivo: "03",
        rep_cancelacion_en_curso_desde: null,
      }),
    ).toBeNull();
  });

  test("regla compartida: detiene solo si el motivo fijo es otro que el elegido", () => {
    expect(isSatCancelMotiveLockedElsewhere("03", "02")).toBe(true);
    expect(isSatCancelMotiveLockedElsewhere("03", "03")).toBe(false);
    expect(isSatCancelMotiveLockedElsewhere(null, "02")).toBe(false);
    // Sin motivo elegido la llamada no iba al SAT: nada que comparar.
    expect(isSatCancelMotiveLockedElsewhere("03", null)).toBe(false);
  });

  test("factura: el listado sin la reserva no fija nada; el retrieve con ella sí", () => {
    const inFlight03 = {
      cfdi_cancelacion_solicitada: false,
      cfdi_cancelacion_motivo: "03",
      cfdi_cancelacion_en_curso_desde: "2026-11-07T10:00:00Z",
    };
    expect(isSatCancelMotiveLockedElsewhere(getInvoiceLockedSatCancelMotive(inFlight03), "02")).toBe(true);
    expect(
      isSatCancelMotiveLockedElsewhere(
        getInvoiceLockedSatCancelMotive({ cfdi_cancelacion_solicitada: false, cfdi_cancelacion_motivo: "03" }),
        "02",
      ),
    ).toBe(false);
  });
});

test.describe("precheck de cancelar REP", () => {
  const cobro = {
    rep_uuid: UUID,
    rep_facturama_id: "fact-1",
    rep_cancelacion_solicitada: false,
    rep_cancelacion_motivo: null as string | null,
    rep_cancelacion_en_curso_desde: null as string | null,
  };

  test("sin motivo fijo deja hacer el POST", () => {
    expect(getCobroRepCancelPrecheck(cobro, "03")).toBeNull();
  });

  test("motivo fijo en otro: se detiene sin POST para reconfirmar", () => {
    const pending02 = { ...cobro, rep_cancelacion_solicitada: true, rep_cancelacion_motivo: "02" };
    expect(getCobroRepCancelPrecheck(pending02, "03")).toBe("needs-confirmation");
    const inFlight03 = { ...cobro, rep_cancelacion_motivo: "03", rep_cancelacion_en_curso_desde: "2026-11-07T10:00:00Z" };
    expect(getCobroRepCancelPrecheck(inFlight03, "02")).toBe("needs-confirmation");
  });

  test("motivo fijo igual al elegido: sigue al POST", () => {
    const pending02 = { ...cobro, rep_cancelacion_solicitada: true, rep_cancelacion_motivo: null };
    expect(getCobroRepCancelPrecheck(pending02, "02")).toBeNull();
  });

  test("sin REP cancelable gana sobre el motivo", () => {
    const sinRep = { ...cobro, rep_uuid: null, rep_cancelacion_solicitada: true, rep_cancelacion_motivo: "02" };
    expect(getCobroRepCancelPrecheck(sinRep, "03")).toBe("not-cancellable");
  });
});

test.describe("cuándo se pide el motivo en la cancelación de una factura", () => {
  test("solo si va a cancelar un CFDI vigente", () => {
    expect(willInvoiceCancelReachSat({ cfdi_uuid: UUID, cfdi_cancelado: false })).toBe(true);
    expect(willInvoiceCancelReachSat({ cfdi_uuid: UUID, cfdi_cancelado: true })).toBe(false);
    expect(willInvoiceCancelReachSat({ cfdi_uuid: null, cfdi_cancelado: false })).toBe(false);
  });

  test("el aviso ya no fija el motivo 02", () => {
    const notice = getInvoiceCancelCfdiNotice({ cfdi_uuid: UUID, cfdi_cancelado: false });
    expect(notice).not.toBeNull();
    expect(notice).not.toContain("02");
  });
});

test.describe("selector del motivo SAT", () => {
  test("arranca sin motivo: opción vacía, habilitado y sin la ayuda de motivo fijo", () => {
    const view = getSatCancelMotiveSelectView({ value: null, lockedMotive: null });
    expect(view.shown).toBe("");
    expect(view.disabled).toBe(false);
    expect(view.hint).not.toBe(SAT_CANCEL_MOTIVE_LOCKED_HINT);
  });

  test("lo elegido se muestra mientras no haya motivo fijo", () => {
    expect(getSatCancelMotiveSelectView({ value: "03", lockedMotive: null }).shown).toBe("03");
  });

  test("con motivo fijo lo muestra bloqueado y explica por qué, aunque se haya elegido otro", () => {
    const view = getSatCancelMotiveSelectView({ value: "03", lockedMotive: "02" });
    expect(view).toEqual({ shown: "02", disabled: true, hint: SAT_CANCEL_MOTIVE_LOCKED_HINT });
  });

  test("también se bloquea mientras la petición está en vuelo", () => {
    expect(getSatCancelMotiveSelectView({ value: "02", lockedMotive: null, disabled: true }).disabled).toBe(true);
  });
});

test.describe("errores nuevos de EC-806", () => {
  test("cancelar factura: motivo_sat y los de cfdi se muestran tal cual", () => {
    for (const message of [
      "Elige el motivo de cancelación ante el SAT: 02 (…) o 03 (…).",
      "La cancelación ya se solicitó ante el SAT con motivo 02 (…); reintenta con el mismo motivo.",
      "Motivo SAT no válido (01): usa 02 (…) o 03 (…).",
    ]) {
      expect(cancelInvoiceErrorMessage(drf400({ motivo_sat: [message] }))).toBe(message);
      expect(cancelInvoiceErrorMessage(drf400({ motivo_sat: message }))).toBe(message);
    }
    for (const message of [
      "Hay una cancelación del CFDI ante el SAT en curso; espera un minuto y vuelve a intentar.",
      `La factura tiene CFDI (UUID ${UUID}) pero no su id de Facturama: no se puede cancelar desde aquí. Revísalo en Facturama.`,
    ]) {
      expect(cancelInvoiceErrorMessage(drf400({ cfdi: message }))).toBe(message);
    }
  });

  test("cancelar REP: motivo_sat, rep en curso y rep_incierto se muestran tal cual", () => {
    const enCurso = "Hay una cancelación del REP ante el SAT en curso; espera un minuto y vuelve a intentar.";
    const incierto =
      "Facturama no respondió (timeout); no se sabe si se canceló. Vuelve a intentar en un minuto con el mismo motivo (03).";
    const motivo = "Elige el motivo de cancelación ante el SAT: 02 (…) o 03 (…).";
    expect(cancelCobroRepErrorMessage(drf400({ rep: enCurso }))).toBe(enCurso);
    expect(cancelCobroRepErrorMessage(drf400({ rep_incierto: incierto }))).toBe(incierto);
    expect(cancelCobroRepErrorMessage(drf400({ motivo_sat: [motivo] }))).toBe(motivo);
  });
});

test("el disparador de cancelar REP exige el motivo en el tipo", () => {
  // Solo se comprueba con `npm run typecheck`: la función nunca se llama.
  const typeOnly = (
    withVariables: CobroActionTrigger<{ motivoSat: SatCancelMotive }>,
    withoutVariables: CobroActionTrigger<void>,
  ) => {
    withVariables({ variables: { motivoSat: "03" }, onSettled: () => {} });
    // @ts-expect-error -- sin `variables` no compila.
    withVariables({ onSettled: () => {} });
    // @ts-expect-error -- ni sin opciones.
    withVariables();
    // @ts-expect-error -- ni con un motivo fuera del catálogo.
    withVariables({ variables: { motivoSat: "01" } });
    withoutVariables();
    withoutVariables({ onSettled: () => {} });
  };
  expect(typeof typeOnly).toBe("function");
});
