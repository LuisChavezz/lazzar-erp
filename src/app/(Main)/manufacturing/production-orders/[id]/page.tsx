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
 * neutra como `/orders/[id]`. Por el `startsWith` del proxy cae en la regla
 * `/manufacturing/production-orders` de `routePermissions.ts` y exige
 * `R-PRODUCCION-OP` (no el `R-PRODUCCION` del módulo); junto con el matcher de
 * `proxy.ts`, no hace falta registrar nada. Tampoco tiene entrada en
 * `appRoutes.ts` (otros detalles sí la tienen, ocultos con
 * `showInSidebar: false`, p. ej. `/sales/customers/[id]`): el sub-grupo y la
 * hoja activos se resuelven por prefijo hacia Órdenes de Producción.
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
