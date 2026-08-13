import { ProductionOrderPageContent } from "@/src/features/production-orders/components/ProductionOrderPageContent";

/**
 * Detalle de una orden de producción —
 * `GET /produccion/orden-produccion/onboarding/?op_id={id}`.
 *
 * A diferencia de bordado/reflejante/corte de manga, NO consume un `retrieve`
 * por `/{id}/`: usa el mismo endpoint de onboarding que ya trae
 * `ProductionOrderDetailDialog`, con el id como QUERY PARAM
 * (`useProductionOrderOnboarding`). El SEGMENTO de ruta sigue siendo `[id]`
 * porque es lo que identifica la orden en la URL; el hook internamente lo
 * traduce al parámetro que el backend espera.
 *
 * Cuelga del módulo (`/manufacturing/production-orders/[id]`) y NO de una ruta
 * neutra como `/orders/[id]`: hereda `R-PRODUCCION` del prefijo
 * `/manufacturing` que ya cubren `routePermissions.ts` y el matcher de
 * `proxy.ts` — no hace falta registrar nada. Las páginas de detalle tampoco
 * entran en `appRoutes.ts`, que alimenta el home y el sidebar (solo índices).
 *
 * Convive con `ProductionOrderDetailDialog`/`ProductionOrderDetailByIdDialog`,
 * que siguen montados sin cambios. Esta página es la vista extendida, de SOLO
 * LECTURA.
 */
export default async function ProductionOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="w-full space-y-6 pt-2">
      <ProductionOrderPageContent orderId={id} />
    </div>
  );
}
