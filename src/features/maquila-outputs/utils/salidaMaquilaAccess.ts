import type { PermissionContext } from "@/src/interfaces/permission-context.interface";
import { canSeeProductionCosts, hasProductionPermission } from "@/src/utils/productionPermissions";
import { canAccessRoute } from "@/src/utils/routeAccess";

/** Ruta del listado de SM: su regla de acceso (`R-PRODUCCION-OP`) es la de leer SM. */
export const SALIDAS_MAQUILA_PATH = "/manufacturing/maquila-outputs";

/**
 * Ver SM fuera de su pantalla (la sección de la OB y la OR): la misma regla que
 * la ruta del listado, así que no puede discrepar del menú ni del proxy.
 */
export const canReadSalidaMaquila = (user: PermissionContext | null | undefined): boolean =>
  canAccessRoute(SALIDAS_MAQUILA_PATH, user);

/**
 * Cancelar una SM: `C-PRODUCCION-OP`, el mismo código con el que se genera
 * (sin cambio en EC-868).
 */
export const canWriteSalidaMaquila = (user: PermissionContext | null | undefined): boolean =>
  hasProductionPermission(user, "OP", "C");

/**
 * "Generar SM" exige además `R-PRODUCCION-COSTOS` (EC-868): el alta captura el
 * precio de maquila por renglón y muestra su importe y total, así que quien no
 * ve costos no la ofrece.
 */
export const canGenerateSalidaMaquila = (user: PermissionContext | null | undefined): boolean =>
  canWriteSalidaMaquila(user) && canSeeProductionCosts(user);
