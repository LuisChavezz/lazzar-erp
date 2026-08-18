import { ReflectiveOrderDetailContent } from "@/src/features/reflective-orders/components/ReflectiveOrderDetailContent";

/**
 * Detalle de una orden de reflejante — `GET /produccion/orden-reflejante/{id}/`.
 *
 * Cuelga del módulo (`/wms/reflective-orders/[id]`) y NO de una ruta
 * neutra como `/orders/[id]`: una OR solo se consulta desde Producción, así que
 * hereda `R-PRODUCCION` del prefijo `/manufacturing` que ya cubren
 * `routePermissions.ts` y el matcher de `proxy.ts` — no hace falta registrar
 * nada. Las páginas de detalle tampoco entran en `appRoutes.ts`, que alimenta
 * el home y el sidebar (solo índices).
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
