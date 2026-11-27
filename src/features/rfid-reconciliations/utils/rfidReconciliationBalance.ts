import { safeParseAmount } from "@/src/utils/formatCurrency";
import type {
  RfidReconciliationEstatus,
  RfidReconciliationSummary,
  RfidReconciliationTotals,
} from "../interfaces/rfid-reconciliation.interface";

/**
 * Cuadre del encuadre a partir de sus RENGLONES. `total_leido` y `completo` del
 * backend cuentan también las lecturas sin asignar (EPC no registrado, otro
 * producto), así que con ellos un encuadre de piezas ajenas parecía cuadrar.
 * Aquí lo leído es solo lo que sumó a un renglón y lo sin asignar va aparte.
 *
 * - `diferencia`: Σ esperado − Σ leído por renglón.
 * - `cuadra`: ningún renglón con diferencia y nada sin asignar (dos renglones
 *   que se compensan no cuadran).
 */
export const reconciliationBalance = (resumen: Pick<RfidReconciliationSummary, "detalle" | "total_sin_asignar">) => {
  let esperado = 0;
  let leido = 0;
  let renglonesConDiferencia = 0;
  for (const line of resumen.detalle) {
    esperado += safeParseAmount(line.esperado);
    leido += safeParseAmount(line.leido);
    if (safeParseAmount(line.diferencia) !== 0) renglonesConDiferencia += 1;
  }
  const sinAsignar = safeParseAmount(resumen.total_sin_asignar);
  return {
    esperado,
    leido,
    sinAsignar,
    diferencia: esperado - leido,
    renglonesConDiferencia,
    cuadra: renglonesConDiferencia === 0 && sinAsignar === 0,
  };
};

/**
 * Lo mismo con los totales de la fila del listado, que no trae renglones:
 * leído asignado = `total_leido` − `total_sin_asignar`. No ve dos renglones que
 * se compensan; para eso está el detalle.
 */
export const rowBalance = (row: Pick<RfidReconciliationTotals, "total_esperado" | "total_leido" | "total_sin_asignar">) => {
  const esperado = safeParseAmount(row.total_esperado);
  const sinAsignar = safeParseAmount(row.total_sin_asignar);
  const leido = safeParseAmount(row.total_leido) - sinAsignar;
  return { esperado, leido, sinAsignar, cuadra: leido === esperado && sinAsignar === 0 };
};

/**
 * ¿Se puede aceptar ya? Solo un encuadre PENDIENTE, con la lectura en pausa y
 * sin lecturas por enviar: así la confirmación muestra los totales finales y
 * ninguna lectura llega después de aceptar (el backend la rechazaría).
 */
export const acceptAvailability = ({
  estatus,
  reading,
  pendingReads,
}: {
  estatus: RfidReconciliationEstatus;
  reading: boolean;
  pendingReads: number;
}): { allowed: boolean; reason: string | null } => {
  if (estatus !== "PENDIENTE") return { allowed: false, reason: null };
  if (reading) return { allowed: false, reason: "Pausa la lectura para aceptar." };
  if (pendingReads > 0) return { allowed: false, reason: "Espera a que terminen de enviarse las lecturas." };
  return { allowed: true, reason: null };
};

/** Lo que cambia la lectura con la antena en el detalle. */
export type CaptureEvent = "start" | "pause" | "queue-stopped" | "cancel-opened" | "dialog-closed";

/**
 * Estado de la lectura tras un evento. Todo menos `start` la apaga: pausar, la
 * cola detenida (si no, "Aceptar" pediría pausar sin botón de pausa), abrir
 * "Cancelar" (ninguna lectura contra un encuadre que se cancela) y cerrar el
 * detalle. El listado se relee una vez cuando la lectura se apaga, y siempre al
 * cerrar el detalle.
 */
export const nextCaptureState = (
  reading: boolean,
  event: CaptureEvent,
): { reading: boolean; refreshList: boolean } => {
  if (event === "start") return { reading: true, refreshList: false };
  return { reading: false, refreshList: reading || event === "dialog-closed" };
};
