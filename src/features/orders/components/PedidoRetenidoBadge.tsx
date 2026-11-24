import type { PedidoListItem } from "../interfaces/order.interface";
import { isPedidoRetenido } from "../utils/pedidoRetencion";

/**
 * Insignia "Retenido" de una fila de pedidos: el pedido está congelado por Mesa
 * de Control. El motivo va en el `title` (el listado no trae fecha ni quién;
 * eso está en el detalle). Nada si no está retenido.
 */
export function PedidoRetenidoBadge({
  pedido,
}: {
  pedido: Pick<PedidoListItem, "retenido" | "motivo_retencion">;
}) {
  if (!isPedidoRetenido(pedido)) return null;
  const motivo = pedido.motivo_retencion?.trim();
  return (
    <span
      className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium leading-none whitespace-nowrap bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300"
      title={motivo ? `Retenido: ${motivo}` : "Retenido por Mesa de Control"}
    >
      Retenido
    </span>
  );
}
