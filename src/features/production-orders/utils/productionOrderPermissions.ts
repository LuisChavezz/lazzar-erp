import type { PermissionContext } from "@/src/interfaces/permission-context.interface";
import { hasPermission } from "@/src/utils/permissions";
import { PRODUCTION_ORDER_STATUS_CODE } from "../constants/productionOrderStatus";

/**
 * Códigos de escritura de las órdenes de producción, los que el backend exigirá
 * (EC-899): crear con `C-`, editar —cambiar estatus, ruta crítica, recalcular
 * consumos— con `E-`, y cancelar (destructivo) además con `D-` (EC-895).
 * `hasPermission` deja pasar al rol "admin".
 */
export const PRODUCTION_ORDER_CREATE_PERMISSION = "C-PRODUCCION-OP";
export const PRODUCTION_ORDER_EDIT_PERMISSION = "E-PRODUCCION-OP";
export const PRODUCTION_ORDER_DELETE_PERMISSION = "D-PRODUCCION-OP";

/** Dar de alta una OP: desde el listado o desde una pre-orden ("Crear OP"). */
export const canCreateProductionOrder = (user?: PermissionContext | null): boolean =>
  hasPermission(PRODUCTION_ORDER_CREATE_PERMISSION, user);

/** Cambiar estatus, editar la ruta crítica y recalcular consumos de una OP. */
export const canEditProductionOrder = (user?: PermissionContext | null): boolean =>
  hasPermission(PRODUCTION_ORDER_EDIT_PERMISSION, user);

/** Cancelar una OP (llevarla a Cancelado): destructivo, exige además `D-PRODUCCION-OP`. */
export const canCancelProductionOrder = (user?: PermissionContext | null): boolean =>
  canEditProductionOrder(user) && hasPermission(PRODUCTION_ORDER_DELETE_PERMISSION, user);

/**
 * Opciones del menú "Cambiar estatus" que puede ver `user` (EC-895): ninguna
 * sin `E-PRODUCCION-OP` (el menú no se pinta), y Cancelado solo con
 * `D-PRODUCCION-OP` también. El resto de destinos no cambia.
 */
export const visibleProductionOrderStatusOptions = <T extends { estatus_op: number }>(
  options: readonly T[],
  user?: PermissionContext | null,
): T[] => {
  if (!canEditProductionOrder(user)) return [];
  const canCancel = canCancelProductionOrder(user);
  return options.filter(
    (option) => canCancel || option.estatus_op !== PRODUCTION_ORDER_STATUS_CODE.CANCELLED,
  );
};

/** Aviso de solo lectura de la ruta crítica sin `E-PRODUCCION-OP`. */
export const CRITICAL_PATH_FORBIDDEN_NOTICE =
  "No tienes permiso para editar órdenes de producción: la ruta crítica es de solo lectura.";

/** Motivo del botón "Recalcular consumos" deshabilitado sin `E-PRODUCCION-OP`. */
export const RECALCULATE_FORBIDDEN_REASON =
  "No tienes permiso para editar órdenes de producción: no puedes recalcular sus consumos.";
