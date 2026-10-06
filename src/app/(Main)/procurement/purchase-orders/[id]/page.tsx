import { PurchaseOrderPageContent } from "@/src/features/purchase-orders/components/PurchaseOrderPageContent";
import {
  SUPPLIER_ORIGIN_QUERY_KEYS,
  type PurchaseOrderBackParams,
} from "@/src/features/purchase-orders/constants/purchaseOrderDetailOrigins";

/**
 * Detalle de una orden de compra — `GET /compras/ordenes/{id}/`.
 *
 * Cuelga del módulo (`/procurement/purchase-orders/[id]`) y NO de una ruta
 * neutra como `/orders/[id]`: una OC solo se consulta desde Compras. Por el
 * `startsWith` del proxy cae en la regla `/procurement/purchase-orders` de
 * `routePermissions.ts` y exige `R-COMPRAS-OC` (no el `R-COMPRAS` del
 * módulo); junto con el matcher de `proxy.ts`, no hace falta registrar nada.
 * Tampoco tiene entrada en `appRoutes.ts` (otros detalles sí la tienen, ocultos
 * con `showInSidebar: false`, p. ej. `/sales/customers/[id]`): el sub-grupo y
 * la hoja activos se resuelven por prefijo hacia Órdenes de Compra.
 *
 * A esta ruta enlazan el listado de órdenes de compra (`PurchaseOrderView`),
 * el folio de OC de Recepciones (`PurchaseOrderReceiptColumns`, con
 * `?from=purchase-order-receipts`) y el historial de compras del detalle de
 * proveedor (`?from=supplier&proveedor=…` más sus filtros). El `?from=` decide
 * el "Volver" con el mismo patrón que el detalle de pedido: una lista cerrada
 * de orígenes (`purchaseOrderDetailOrigins`) mapeada a destinos fijos, salvo
 * `supplier`, que reconstruye la URL del proveedor con valores validados; sin
 * `from` o con uno desconocido vuelve al listado de órdenes de compra.
 *
 * Convive con `PurchaseOrderDetailDialog`, que sigue montado sin cambios y
 * alimenta "Documentos relacionados" del detalle de pedido
 * (`CLICKABLE_DOC_TIPOS.orden_compra`). Esta página es la vista extendida, de
 * SOLO LECTURA: las acciones (editar, confirmar, cancelar, correo, PDF) viven
 * en el menú del listado.
 */
export default async function PurchaseOrderDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const query = await searchParams;
  // Una llave repetida llega como arreglo: se toma solo un valor de texto, y
  // nada más. Estos valores siguen CRUDOS; `resolvePurchaseOrderBack` los
  // valida uno por uno y nunca copia la query a un `href`.
  const first = (value: string | string[] | undefined) =>
    Array.isArray(value) ? value[0] : value;
  const backParams: PurchaseOrderBackParams = Object.fromEntries(
    SUPPLIER_ORIGIN_QUERY_KEYS.map((key) => [key, first(query[key])]),
  );

  return (
    <div className="w-full space-y-6 pt-2">
      <PurchaseOrderPageContent orderId={id} from={first(query.from)} backParams={backParams} />
    </div>
  );
}
