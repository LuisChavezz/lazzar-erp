import { ReflectiveOrderDetailContent } from "@/src/features/reflective-orders/components/ReflectiveOrderDetailContent";

/**
 * Detalle de una orden de reflejante — `GET /produccion/orden-reflejante/{id}/`.
 *
 * Cuelga del módulo (`/manufacturing/reflective-orders/[id]`) y NO de una ruta
 * neutra como `/orders/[id]`: una OR solo se consulta desde Producción. Por el
 * `startsWith` del proxy cae en la regla `/manufacturing/reflective-orders` de
 * `routePermissions.ts` y exige `R-PRODUCCION-OR` (no el `R-PRODUCCION` del
 * módulo); junto con el matcher de `proxy.ts`, no hace falta registrar nada.
 * Tampoco tiene entrada en `appRoutes.ts` (otros detalles sí la tienen, ocultos
 * con `showInSidebar: false`, p. ej. `/sales/customers/[id]`): el sub-grupo y
 * la hoja activos se resuelven por prefijo hacia Órdenes de Reflejante.
 *
 * Convive con `ReflectiveOrderDetailDialog`, que sigue montado en
 * `ReflectiveOrdersView` como la vía del 409 de duplicado del alta —abre por un
 * id que puede no estar en la lista cargada—. Esta página es la vista extendida,
 * de SOLO LECTURA: el backend no expone transición de estatus (`PUT`/`PATCH` →
 * 405).
 */
export default async function ReflectiveOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="w-full space-y-6 pt-2">
      <ReflectiveOrderDetailContent orderId={id} />
    </div>
  );
}
