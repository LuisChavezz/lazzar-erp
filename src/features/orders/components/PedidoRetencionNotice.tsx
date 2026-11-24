import { LockIcon } from "@/src/components/Icons";
import { formatShortDateTime } from "@/src/utils/formatDate";
import type { PedidoDetail } from "../interfaces/order.interface";
import { isPedidoRetenido } from "../utils/pedidoRetencion";

type PedidoRetencionNoticeProps = {
  pedido: Pick<
    PedidoDetail,
    "retenido" | "motivo_retencion" | "fecha_retencion" | "retenido_por_nombre"
  >;
};

/**
 * Aviso del detalle de un pedido RETENIDO por Mesa de Control: por qué,
 * cuándo y quién. No se monta si el pedido no está retenido. Quién lo retuvo
 * (`retenido_por_nombre`) se omite si el backend no lo trae; la fecha y el
 * motivo dicen "—" / "Sin motivo registrado." en vez de esconder el aviso.
 */
export function PedidoRetencionNotice({ pedido }: PedidoRetencionNoticeProps) {
  if (!isPedidoRetenido(pedido)) return null;
  const retuvo = pedido.retenido_por_nombre?.trim();
  return (
    <section
      aria-label="Pedido retenido"
      className="flex gap-3 rounded-3xl border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 px-6 md:px-8 py-4"
    >
      <LockIcon className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden="true" />
      <div className="min-w-0 space-y-1.5">
        <h2 className="text-sm font-semibold text-amber-800 dark:text-amber-200">
          Pedido retenido por Mesa de Control
        </h2>
        <p className="text-sm text-slate-700 dark:text-slate-200 whitespace-pre-line wrap-break-word">
          {pedido.motivo_retencion?.trim() || "Sin motivo registrado."}
        </p>
        <dl className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-slate-600 dark:text-slate-300">
          <div className="flex gap-1.5">
            <dt className="text-slate-500 dark:text-slate-400">Desde:</dt>
            <dd>{formatShortDateTime(pedido.fecha_retencion)}</dd>
          </div>
          {retuvo && (
            <div className="flex gap-1.5">
              <dt className="text-slate-500 dark:text-slate-400">Retuvo:</dt>
              <dd>{retuvo}</dd>
            </div>
          )}
        </dl>
        <p className="text-xs text-amber-700 dark:text-amber-300">
          No se puede surtir, empacar, despachar ni generar órdenes sobre él hasta que se libere.
        </p>
      </div>
    </section>
  );
}
