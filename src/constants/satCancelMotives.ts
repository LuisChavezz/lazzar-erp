/**
 * Motivos del SAT que el ERP ofrece al cancelar un CFDI de factura o un REP
 * (EC-806/EC-808): los mismos dos que acepta el backend en `motivo_sat` de
 * `facturas/{id}/cancelar/` y `cobros/{id}/cancelar-rep/`. El 01 (requiere el
 * UUID de un sustituto) y el 04 (factura global) no se ofrecen.
 *
 * Fuente ÚNICA del catálogo: el selector, el tipo y la guarda salen de aquí.
 */
export const SAT_CANCEL_MOTIVES = [
  { value: "02", label: "Comprobante emitido con errores sin relación" },
  { value: "03", label: "No se llevó a cabo la operación" },
] as const;

/** Clave de un motivo del catálogo ("02" | "03"), tal cual viaja en `motivo_sat`. */
export type SatCancelMotive = (typeof SAT_CANCEL_MOTIVES)[number]["value"];

/** ¿`value` es una clave del catálogo? Guarda de tipo para lo que llega del backend o de un `<select>`. */
export const isSatCancelMotive = (value: unknown): value is SatCancelMotive =>
  SAT_CANCEL_MOTIVES.some((motive) => motive.value === value);

/** "02 · Comprobante emitido con errores sin relación". */
export const formatSatCancelMotive = (value: SatCancelMotive): string => {
  const motive = SAT_CANCEL_MOTIVES.find((item) => item.value === value);
  return motive ? `${motive.value} · ${motive.label}` : value;
};

/**
 * Motivo con el que el backend da por pedida una cancelación que quedó
 * marcada SIN motivo guardado (código anterior a EC-806, que siempre mandaba 02).
 */
export const LEGACY_SAT_CANCEL_MOTIVE: SatCancelMotive = "02";

/**
 * El motivo FIJO de una cancelación ante el SAT, o `null` si el usuario puede
 * elegirlo. Mismo criterio que el backend (`_motivo_sat`): queda fijo mientras
 * la cancelación está solicitada y pendiente de que el receptor la acepte
 * (`requested`), o mientras hay un intento en vuelo o que terminó sin
 * respuesta (`inFlightSince`); el reintento debe reenviar ese motivo y otro
 * responde 400. Un motivo guardado vacío cuenta como 02
 * (`LEGACY_SAT_CANCEL_MOTIVE`). Un valor fuera del catálogo (no debería
 * llegar) no se fija: el backend decide.
 *
 * Tras un rechazo del receptor o de Facturama los dos flags vuelven a
 * apagarse y se puede elegir otro motivo.
 */
export const getLockedSatCancelMotive = ({
  requested,
  motive,
  inFlightSince,
}: {
  requested: boolean | undefined;
  motive: string | null | undefined;
  inFlightSince: string | null | undefined;
}): SatCancelMotive | null => {
  if (requested !== true && !inFlightSince) return null;
  if (!motive) return LEGACY_SAT_CANCEL_MOTIVE;
  return isSatCancelMotive(motive) ? motive : null;
};

/**
 * ¿Hay que detener una cancelación para volver a confirmar porque el motivo SAT
 * quedó FIJO (`locked`, de `getLockedSatCancelMotive` sobre el registro fresco)
 * en otro distinto del elegido? Pasa cuando, después de abrir el diálogo, se
 * pidió la cancelación o quedó un intento sin respuesta: el backend rechazaría
 * el motivo elegido con 400. Sin motivo elegido (`null`: la llamada no iba al
 * SAT) no detiene nada. Regla única para facturas y REP.
 */
export const isSatCancelMotiveLockedElsewhere = (
  locked: SatCancelMotive | null,
  chosen: SatCancelMotive | null,
): boolean => chosen !== null && locked !== null && locked !== chosen;

/** Aviso del diálogo cuando el precheck encontró el motivo fijo en otro después de abrirlo. */
export const SAT_CANCEL_MOTIVE_LOCKED_SINCE_OPENED_MESSAGE =
  "El motivo de cancelación ante el SAT quedó fijo después de abrir este diálogo. Revisa el motivo y confirma de nuevo.";
