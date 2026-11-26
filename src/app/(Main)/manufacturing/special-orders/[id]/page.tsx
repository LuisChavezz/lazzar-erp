import { SpecialOrderPageContent } from "@/src/features/special-orders/components/SpecialOrderPageContent";

/**
 * Detalle de un pedido especial — `GET /produccion/pedidos-especiales/{id}/`.
 *
 * Cuelga de `/manufacturing/special-orders`, cuya regla en `routePermissions.ts`
 * pide `C-PRODUCCION-OP` (quien puede crear OP), igual que su listado. El título del encabezado lo resuelve `getPageTitle` por
 * prefijo. Las páginas de detalle no entran en `appRoutes.ts` (solo índices).
 */
export default async function SpecialOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="w-full space-y-6 pt-2">
      <SpecialOrderPageContent orderId={id} />
    </div>
  );
}
