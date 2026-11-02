import { ClockIcon } from "@/src/components/Icons";
import type { Cobro } from "../interfaces/collection.interface";
import { isCobroRepPending } from "../utils/cobroRepStamping";
import {
  COBRO_REP_CANCELLATION_REQUESTED_HINT,
  COBRO_REP_CANCELLATION_REQUESTED_LABEL,
} from "../utils/cobroRepCancellation";

export type CobroRepStateLabel = "Timbrado" | "Pendiente" | "";

/**
 * Estado del REP de un cobro como texto: `"Timbrado"` con UUID, `"Pendiente"`
 * con un timbrado sin confirmar (`isCobroRepPending`) y `""` sin REP. Es el
 * valor que ordena, busca y exporta la columna REP del listado.
 */
export const getCobroRepStateLabel = (
  cobro: Pick<Cobro, "rep_uuid" | "rep_pendiente">,
): CobroRepStateLabel => (cobro.rep_uuid ? "Timbrado" : isCobroRepPending(cobro) ? "Pendiente" : "");

/**
 * Estado del REP de un cobro, tal como se pinta en el listado de cobros y en la
 * sección "Cobros" del detalle de CxC: un solo lugar para el texto, el color y
 * el tooltip.
 *
 * Con una cancelación del REP pendiente de que el receptor la acepte
 * (`rep_cancelacion_solicitada`) agrega el reloj ámbar, el mismo lenguaje que el
 * folio de una factura en ese estado: el REP sigue timbrado y vigente, así que
 * el texto no cambia. Ícono y no texto, porque la columna es angosta.
 */
export function CobroRepState({
  cobro,
}: {
  cobro: Pick<Cobro, "rep_uuid" | "rep_pendiente" | "rep_cancelacion_solicitada">;
}) {
  const label = getCobroRepStateLabel(cobro);
  if (!label) return <span className="text-slate-400">—</span>;
  return (
    <span className="inline-flex items-center gap-1">
      <span
        className={`text-xs font-medium ${
          label === "Timbrado" ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"
        }`}
        title={label === "Pendiente" ? "Timbrado sin confirmar en Facturama" : undefined}
      >
        {label}
      </span>
      {cobro.rep_cancelacion_solicitada && (
        <span
          className="inline-flex shrink-0 text-amber-600 dark:text-amber-400"
          role="img"
          aria-label={COBRO_REP_CANCELLATION_REQUESTED_LABEL}
          title={`${COBRO_REP_CANCELLATION_REQUESTED_LABEL}. ${COBRO_REP_CANCELLATION_REQUESTED_HINT}`}
        >
          <ClockIcon className="w-3.5 h-3.5" aria-hidden="true" />
        </span>
      )}
    </span>
  );
}
