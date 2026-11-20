import type { Picking } from "../interfaces/picking.interface";

/** Días de `desde` a `hasta` (claves "AAAA-MM-DD"); `null` si alguna no se lee. */
export const diasEntre = (desde: string, hasta: string): number | null => {
  const a = Date.parse(`${desde}T00:00:00Z`);
  const b = Date.parse(`${hasta}T00:00:00Z`);
  return Number.isNaN(a) || Number.isNaN(b) ? null : Math.round((b - a) / 86_400_000);
};

export type UrgenciaEntrega = "vencida" | "pronto" | "normal" | "sin";

/**
 * Qué tan urgente es la entrega del pedido para este surtido, contra `hoy`
 * ("AAAA-MM-DD"): uno ya enviado o cancelado ya no apura. "Pronto" = hoy o en
 * los próximos 3 días. Sin `hoy` no se marca urgencia.
 */
export function urgenciaEntrega(
  picking: Pick<Picking, "pedido_fecha_entrega" | "estado" | "estado_empaque">,
  hoy: string,
): { urgencia: UrgenciaEntrega; dias: number | null } {
  const entrega = picking.pedido_fecha_entrega;
  if (!entrega) return { urgencia: "sin", dias: null };
  const dias = hoy ? diasEntre(hoy, entrega) : null;
  if (dias === null || picking.estado === "Cancelado" || picking.estado_empaque === "ENVIADO") {
    return { urgencia: "normal", dias };
  }
  if (dias < 0) return { urgencia: "vencida", dias };
  if (dias <= 3) return { urgencia: "pronto", dias };
  return { urgencia: "normal", dias };
}
