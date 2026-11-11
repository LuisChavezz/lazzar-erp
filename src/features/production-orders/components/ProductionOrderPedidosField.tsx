"use client";

import { useSession } from "next-auth/react";
import { canAccessRoute } from "@/src/utils/routeAccess";
import { pedidoDetailPath } from "@/src/features/orders/constants/pedidoDetailOrigins";
import { PedidoFolioLink } from "@/src/features/orders/components/PedidoFolioLink";
import { PedidoVinculadoFolio } from "@/src/features/orders/components/PedidoVinculadoFolio";
import type { ProductionOrderOnboarding } from "../interfaces/production-order.interface";
import { opPedidoRefs, pedidoRefLabel } from "../utils/opPedidos";

type PedidosSource = Pick<
  ProductionOrderOnboarding,
  "pedido" | "pedido_folio" | "pedido_vinculado" | "pedidos"
>;

/**
 * Campo "Pedido" de la página de detalle de la OP: todos los pedidos que cubre
 * (`pedidos`, principal primero), cada uno como enlace a su detalle 360°.
 *
 * Sin `pedidos` (o vacío) queda `PedidoVinculadoFolio`, el campo de un solo
 * pedido de siempre. Igual que ahí, un folio solo enlaza si el usuario puede
 * abrir `/orders` (`canAccessRoute`); si no, se lee como texto.
 */
export function ProductionOrderPedidosField({ data }: { data: PedidosSource }) {
  const { data: session } = useSession();
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
      {refs.map((ref) =>
        canAccessRoute(pedidoDetailPath(ref.id), session?.user) ? (
          <PedidoFolioLink
            key={ref.id}
            pedidoId={ref.id}
            folio={pedidoRefLabel(ref)}
            from="production-orders"
            className="font-mono text-sky-600 dark:text-sky-400"
            tone="accent"
          />
        ) : (
          <span key={ref.id} className="font-mono">
            {pedidoRefLabel(ref)}
          </span>
        ),
      )}
    </span>
  );
}
