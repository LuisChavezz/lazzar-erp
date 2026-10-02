import { PedidoDetailContent } from "@/src/features/orders/components/PedidoDetailContent";
import {
  ORDER_DETAIL_SHEET_PARAM,
  type OrderDetailSearchParams,
} from "@/src/features/orders/constants/orderDetailSheets";

/**
 * Detalle 360° de un pedido — `GET /ventas/pedidos/{id}/`.
 *
 * Ruta NEUTRA (`/orders/[id]`, no colgada de ningún módulo) para poder
 * enlazarse desde varios (Mesa de Control, Ventas, Picking…). El origen viaja
 * en `?from=` para que el "Volver" regrese a quien la abrió, y la hoja activa
 * ("Pedido" o "Avances") en `?sheet=`. Requiere auth + workspace y CUALQUIERA
 * de los permisos de la regla "/orders" en `routePermissions` (ver
 * `proxy.ts`); los importes se filtran por rol en el backend.
 */
export default async function PedidoDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<OrderDetailSearchParams>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const from = typeof query.from === "string" ? query.from : undefined;
  const sheet = query[ORDER_DETAIL_SHEET_PARAM];

  return (
    <div className="w-full space-y-6 pt-2">
      <PedidoDetailContent
        pedidoId={id}
        from={from}
        sheet={typeof sheet === "string" ? sheet : undefined}
        searchParams={query}
      />
    </div>
  );
}
