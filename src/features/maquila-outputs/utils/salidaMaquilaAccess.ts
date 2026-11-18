import type { PermissionContext } from "@/src/interfaces/permission-context.interface";
import { canSeeProductionCosts, hasProductionPermission } from "@/src/utils/productionPermissions";

/**
 * Cerrar y cancelar una SM: `C-PRODUCCION-OP`, el mismo código con el que se
 * genera (sin cambio en EC-868).
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
