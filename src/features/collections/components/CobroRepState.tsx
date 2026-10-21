import type { Cobro } from "../interfaces/collection.interface";
import { isCobroRepPending } from "../utils/cobroRepStamping";

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
 */
export function CobroRepState({ cobro }: { cobro: Pick<Cobro, "rep_uuid" | "rep_pendiente"> }) {
  const label = getCobroRepStateLabel(cobro);
  if (!label) return <span className="text-slate-400">—</span>;
  return (
    <span
      className={`text-xs font-medium ${
        label === "Timbrado" ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"
      }`}
      title={label === "Pendiente" ? "Timbrado sin confirmar en Facturama" : undefined}
    >
      {label}
    </span>
  );
}
