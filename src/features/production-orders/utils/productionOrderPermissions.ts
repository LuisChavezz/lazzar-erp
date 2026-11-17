import type { PermissionContext } from "@/src/interfaces/permission-context.interface";
import { hasPermission } from "@/src/utils/permissions";

/**
 * Códigos de escritura de las órdenes de producción, los que el backend exigirá
 * (EC-899): crear con `C-`, y editar —cambiar estatus, ruta crítica, recalcular
 * consumos— con `E-` (EC-895). `hasPermission` deja pasar al rol "admin".
 */
export const PRODUCTION_ORDER_CREATE_PERMISSION = "C-PRODUCCION-OP";
export const PRODUCTION_ORDER_EDIT_PERMISSION = "E-PRODUCCION-OP";

/** Dar de alta una OP: desde el listado o desde una pre-orden ("Crear OP"). */
export const canCreateProductionOrder = (user?: PermissionContext | null): boolean =>
  hasPermission(PRODUCTION_ORDER_CREATE_PERMISSION, user);

/** Cambiar estatus, editar la ruta crítica y recalcular consumos de una OP. */
export const canEditProductionOrder = (user?: PermissionContext | null): boolean =>
  hasPermission(PRODUCTION_ORDER_EDIT_PERMISSION, user);

/** Aviso de solo lectura de la ruta crítica sin `E-PRODUCCION-OP`. */
export const CRITICAL_PATH_FORBIDDEN_NOTICE =
  "No tienes permiso para editar órdenes de producción: la ruta crítica es de solo lectura.";

/** Motivo del botón "Recalcular consumos" deshabilitado sin `E-PRODUCCION-OP`. */
export const RECALCULATE_FORBIDDEN_REASON =
  "No tienes permiso para editar órdenes de producción: no puedes recalcular sus consumos.";
