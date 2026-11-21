import type { PermissionContext } from "@/src/interfaces/permission-context.interface";
import { canAccessRoute } from "@/src/utils/routeAccess";
import {
  corteMangaOrderDetailPath,
  embroideryOrderDetailPath,
  productionOrderDetailPath,
  reflectiveOrderDetailPath,
} from "@/src/constants/workOrderRoutes";
import { SALIDAS_MAQUILA_PATH } from "@/src/features/maquila-outputs/utils/salidaMaquilaAccess";

/**
 * Ruta de sección de cada orden de trabajo que el pedido 360° abre en un
 * diálogo (`ORDER_DOCUMENT_DIALOGS`). El diálogo pide el detalle al endpoint de
 * SU sección, que el backend niega (403) sin ese código; por eso se abre solo si
 * el usuario puede abrir la página de detalle de esa sección. La regla vive en
 * `routePermissions` y aquí solo se nombra la ruta (EC-895).
 */
const ORDER_DOCUMENT_SECTION_PATHS: Record<string, (id: number) => string> = {
  orden_produccion: productionOrderDetailPath,
  orden_bordado: embroideryOrderDetailPath,
  orden_reflejante: reflectiveOrderDetailPath,
  orden_corte_manga: corteMangaOrderDetailPath,
  // La SM no tiene página por id: su regla de lectura es la de su listado
  // (`canReadSalidaMaquila`, `R-PRODUCCION-OP`).
  salida_maquila: () => SALIDAS_MAQUILA_PATH,
};

/**
 * ¿Puede `user` abrir el detalle del documento `tipo`/`id` desde el pedido? Los
 * tipos sin sección propia (picking, packing, OC, cotización, movimiento) no se
 * restringen aquí: la regla `/orders` sigue siendo su control. `Object.hasOwn`
 * porque `tipo` llega del backend.
 */
export function canOpenOrderDocument(
  tipo: string,
  id: number,
  user?: PermissionContext | null,
): boolean {
  if (!Object.hasOwn(ORDER_DOCUMENT_SECTION_PATHS, tipo)) return true;
  return canAccessRoute(ORDER_DOCUMENT_SECTION_PATHS[tipo](id), user);
}
