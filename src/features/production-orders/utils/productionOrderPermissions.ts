import type { PermissionContext } from "@/src/interfaces/permission-context.interface";
import { hasProductionPermission } from "@/src/utils/productionPermissions";
import { PRODUCTION_ORDER_STATUS_CODE } from "../constants/productionOrderStatus";

/**
 * Reglas de la OP construidas sobre la tabla única de códigos de Producción
 * (`hasProductionPermission`, EC-895): crear con `C-`, editar —cambiar
 * estatus, ruta crítica, recalcular consumos— con `E-`, y cancelar
 * (destructivo) además con `D-`.
 */

/** Cancelar una OP (llevarla a Cancelado): destructivo, exige además `D-PRODUCCION-OP`. */
export const canCancelProductionOrder = (user?: PermissionContext | null): boolean =>
  hasProductionPermission(user, "OP", "E") && hasProductionPermission(user, "OP", "D");

/**
 * Opciones del menú "Cambiar estatus" que puede ver `user` (EC-895): ninguna
 * sin `E-PRODUCCION-OP` (el menú no se pinta), y Cancelado solo con
 * `D-PRODUCCION-OP` también. El resto de destinos no cambia.
 */
export const visibleProductionOrderStatusOptions = <T extends { estatus_op: number }>(
  options: readonly T[],
  user?: PermissionContext | null,
): T[] => {
  if (!hasProductionPermission(user, "OP", "E")) return [];
  const canCancel = canCancelProductionOrder(user);
  return options.filter(
    (option) => canCancel || option.estatus_op !== PRODUCTION_ORDER_STATUS_CODE.CANCELLED,
  );
};

/** Aviso de solo lectura de la ruta crítica mientras la sesión carga o se recupera. */
export const CRITICAL_PATH_PENDING_NOTICE = "Comprobando tus permisos: la ruta crítica queda de solo lectura mientras tanto.";

/** Aviso de solo lectura de la ruta crítica sin `E-PRODUCCION-OP`. */
export const CRITICAL_PATH_FORBIDDEN_NOTICE =
  "No tienes permiso para editar órdenes de producción: la ruta crítica es de solo lectura.";

/** Motivo del botón "Recalcular consumos" mientras la sesión carga o se recupera. */
export const RECALCULATE_PENDING_REASON = "Comprobando tus permisos…";

/** Motivo del botón "Recalcular consumos" deshabilitado sin `E-PRODUCCION-OP`. */
export const RECALCULATE_FORBIDDEN_REASON =
  "No tienes permiso para editar órdenes de producción: no puedes recalcular sus consumos.";
