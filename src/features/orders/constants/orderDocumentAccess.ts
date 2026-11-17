import type { PermissionContext } from "@/src/interfaces/permission-context.interface";
import { canAccessRoute } from "@/src/utils/routeAccess";
import {
  corteMangaOrderDetailPath,
  embroideryOrderDetailPath,
  productionOrderDetailPath,
  reflectiveOrderDetailPath,
} from "@/src/constants/workOrderRoutes";
import { purchaseOrderDetailHref } from "@/src/features/purchase-orders/constants/purchaseOrderDetailOrigins";

/**
 * Rutas de sección de cada documento que el pedido 360° abre en un diálogo
 * (`ORDER_DOCUMENT_DIALOGS`, también "Folios de surtido" y la trazabilidad). El
 * diálogo se abre solo si el usuario puede abrir ALGUNA de esas rutas; si no,
 * el documento queda como texto (EC-895). La regla vive en `routePermissions`
 * y aquí solo se nombran las rutas:
 * - las cuatro órdenes de Producción: su página de detalle (`R-PRODUCCION-OP`
 *   / `-OB` / `-OR` / `-CM`);
 * - surtido y embarque: su listado en WMS (`R-WMS-PICKING` / `R-WMS-PACKING`),
 *   que no tiene detalle propio;
 * - orden de compra: su página de detalle (`R-COMPRAS-OC`);
 * - cotización: la lista de Ventas o la de Mesa de Control
 *   (`R-CRM-COTIZACIONES` o `R-MESACONTROL-COTI`), las dos pantallas que la
 *   muestran.
 */
const ORDER_DOCUMENT_SECTION_PATHS: Record<string, (id: number) => readonly string[]> = {
  orden_produccion: (id) => [productionOrderDetailPath(id)],
  orden_bordado: (id) => [embroideryOrderDetailPath(id)],
  orden_reflejante: (id) => [reflectiveOrderDetailPath(id)],
  orden_corte_manga: (id) => [corteMangaOrderDetailPath(id)],
  picking: () => ["/wms/picking"],
  packing: () => ["/wms/packing"],
  orden_compra: (id) => [purchaseOrderDetailHref(id)],
  cotizacion: () => ["/sales/quotes", "/operations/quotes"],
};

/**
 * ¿Puede `user` abrir el detalle del documento `tipo`/`id` desde el pedido? Los
 * tipos sin sección registrada (p. ej. el movimiento de inventario) no se
 * restringen aquí: la regla `/orders` sigue siendo su control. `Object.hasOwn`
 * porque `tipo` llega del backend.
 */
export function canOpenOrderDocument(
  tipo: string,
  id: number,
  user?: PermissionContext | null,
): boolean {
  if (!Object.hasOwn(ORDER_DOCUMENT_SECTION_PATHS, tipo)) return true;
  return ORDER_DOCUMENT_SECTION_PATHS[tipo](id).some((path) => canAccessRoute(path, user));
}
