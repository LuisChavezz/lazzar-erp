import { PedidoDetailContent } from "@/src/features/orders/components/PedidoDetailContent";

/**
 * Detalle 360° de un pedido — `GET /ventas/pedidos/{id}/`.
 *
 * Ruta NEUTRA (`/orders/[id]`, no colgada de ningún módulo) para poder
 * enlazarse desde varios (Mesa de Control, Ventas, Picking…). El origen viaja
 * en `?from=` para que el "Volver" regrese a quien la abrió. Requiere auth +
 * workspace y CUALQUIERA de los permisos de la regla "/orders" en
 * `routePermissions` (ver `proxy.ts`); los importes se filtran por rol en el
 * backend.
 */
export default async function PedidoDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string }>;
}) {
  const { id } = await params;
  const { from } = await searchParams;

  return (
    <div className="w-full space-y-6 pt-2">
      <PedidoDetailContent pedidoId={id} from={from} />
    </div>
  );
}
