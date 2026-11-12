"use client";

import { PedidoVinculadoFolio } from "@/src/features/orders/components/PedidoVinculadoFolio";
import type { ProductionOrderOnboarding } from "../interfaces/production-order.interface";
import { opPedidoRefs, pedidoRefLabel } from "../utils/opPedidos";

type PedidosSource = Pick<
  ProductionOrderOnboarding,
  "pedido" | "pedido_folio" | "pedido_vinculado" | "pedidos"
>;

/**
 * Campo "Pedido" de la página de detalle de la OP: todos los pedidos que cubre
 * (`pedidos`, principal primero), cada uno con `PedidoVinculadoFolio` (enlace
 * al 360° solo si el usuario puede abrir `/orders`; si no, texto).
 *
 * Sin `pedidos` (o vacío) queda el campo de un solo pedido de siempre.
 */
export function ProductionOrderPedidosField({ data }: { data: PedidosSource }) {
  const refs = opPedidoRefs(data.pedidos, data.pedido);

  if (!refs) {
    return (
      <PedidoVinculadoFolio
        pedidoVinculado={data.pedido_vinculado}
        pedidoFolio={data.pedido_folio}
        from="production-orders"
      />
    );
  }

  return (
    <span className="flex flex-wrap gap-x-3 gap-y-1">
      {refs.map((ref) => (
        <PedidoVinculadoFolio
          key={ref.id}
          pedidoVinculado={{ id: ref.id, folio: pedidoRefLabel(ref) }}
          pedidoFolio={null}
          from="production-orders"
        />
      ))}
    </span>
  );
}
