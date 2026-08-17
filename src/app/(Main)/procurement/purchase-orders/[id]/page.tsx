import { PurchaseOrderPageContent } from "@/src/features/purchase-orders/components/PurchaseOrderPageContent";

/**
 * Detalle de una orden de compra — `GET /compras/ordenes/{id}/`.
 *
 * Cuelga del módulo (`/procurement/purchase-orders/[id]`) y NO de una ruta
 * neutra como `/orders/[id]`: una OC solo se consulta desde Compras, así que
 * hereda `R-COMPRAS` del prefijo `/procurement` que ya cubren
 * `routePermissions.ts` y el matcher de `proxy.ts` — no hace falta registrar
 * nada. Las páginas de detalle tampoco entran en `appRoutes.ts`, que alimenta
 * el home y el sidebar (solo índices).
 *
 * Sin `searchParams`: a diferencia del detalle 360° de pedido, aquí el
 * "Volver" es fijo al listado del propio módulo (ver `BACK` en
 * `PurchaseOrderPageContent`), que es el único origen que enlaza a esta ruta.
 *
 * Convive con `PurchaseOrderDetailDialog`, que sigue montado sin cambios y
 * alimenta "Documentos relacionados" del detalle de pedido
 * (`CLICKABLE_DOC_TIPOS.orden_compra`). Esta página es la vista extendida, de
 * SOLO LECTURA: las acciones (editar, confirmar, cancelar, correo, PDF) viven
 * en el menú del listado.
 */
export default async function PurchaseOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="w-full space-y-6 pt-2">
      <PurchaseOrderPageContent orderId={id} />
    </div>
  );
}
