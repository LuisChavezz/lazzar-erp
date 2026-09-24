import { SpecialOrderPageContent } from "@/src/features/special-orders/components/SpecialOrderPageContent";

/**
 * Detalle de un pedido especial — `GET /produccion/pedidos-especiales/{id}/`.
 *
 * Cuelga del módulo (`/manufacturing/special-orders/[id]`): sin regla propia en
 * `routePermissions.ts`, cae en la de módulo `/manufacturing` (`R-PRODUCCION`),
 * igual que su listado. El título del encabezado lo resuelve `getPageTitle` por
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
