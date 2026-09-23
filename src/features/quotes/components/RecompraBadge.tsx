import { ORIGIN_BADGE_CLASS } from "../../orders/constants/pedidoStatus";

/**
 * Marca de cotización nacida de "Recompra". Mismo aspecto que los badges de
 * origen del detalle del pedido (`PedidoDetailContent`), incluido el suyo de
 * "Recompra": neutro, para no confundirse con el estatus.
 */
export function RecompraBadge() {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${ORIGIN_BADGE_CLASS}`}
    >
      Recompra
    </span>
  );
}
