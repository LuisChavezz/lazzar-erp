import { EmbroideryOrderDetailContent } from "@/src/features/embroidery/components/EmbroideryOrderDetailContent";

/**
 * Detalle de una orden de bordado — `GET /produccion/orden-bordado/{id}/`.
 *
 * Cuelga del módulo (`/manufacturing/embroidery/[id]`) y NO de una ruta neutra
 * como `/orders/[id]`: una OB solo se consulta desde Producción. Por el
 * `startsWith` del proxy cae en la regla `/manufacturing/embroidery` de
 * `routePermissions.ts` y exige `R-PRODUCCION-OB` (no el `R-PRODUCCION` del
 * módulo); junto con el matcher de `proxy.ts`, no hace falta registrar nada.
 * Tampoco tiene entrada en `appRoutes.ts` (otros detalles sí la tienen, ocultos
 * con `showInSidebar: false`, p. ej. `/sales/customers/[id]`): el sub-grupo y
 * la hoja activos se resuelven por prefijo hacia Órdenes de Bordado.
 *
 * Convive con `EmbroideryOrderDetailDialog`, que sigue siendo la vía rápida
 * desde la tabla y desde el 409 de duplicado del alta. Esta página es la vista
 * extendida ("Avance"), y desde aquí se editan el estatus y la máquina asignada
 * de la orden (`PATCH /produccion/orden-bordado/{id}/`).
 */
export default async function EmbroideryOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="w-full space-y-6 pt-2">
      <EmbroideryOrderDetailContent orderId={id} />
    </div>
  );
}
