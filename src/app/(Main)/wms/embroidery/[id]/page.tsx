import { EmbroideryOrderDetailContent } from "@/src/features/embroidery/components/EmbroideryOrderDetailContent";

/**
 * Detalle de una orden de bordado — `GET /produccion/orden-bordado/{id}/`.
 *
 * Cuelga del módulo (`/wms/embroidery/[id]`) y NO de una ruta neutra
 * como `/orders/[id]`: una OB solo se consulta desde Producción, así que hereda
 * `R-PRODUCCION` del prefijo `/manufacturing` que ya cubren
 * `routePermissions.ts` y el matcher de `proxy.ts` — no hace falta registrar
 * nada. Las páginas de detalle tampoco entran en `appRoutes.ts`, que alimenta
 * el home y el sidebar (solo índices).
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
