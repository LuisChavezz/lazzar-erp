import type { PermissionContext } from "@/src/interfaces/permission-context.interface";
import { hasPermission } from "@/src/utils/permissions";

/**
 * Códigos de escritura de la orden de bordado (EC-895). Editar la ficha y
 * registrar avances exige `E-`; borrar un avance, acción destructiva, exige
 * `D-` (el backend ya lo pide en `bordado-avances`). `hasPermission` deja pasar
 * al rol "admin".
 */
export const EMBROIDERY_EDIT_PERMISSION = "E-PRODUCCION-OB";
export const EMBROIDERY_DELETE_PERMISSION = "D-PRODUCCION-OB";

/** Editar la ficha de la OB y registrar avances. */
export const canEditEmbroideryOrder = (user?: PermissionContext | null): boolean =>
  hasPermission(EMBROIDERY_EDIT_PERMISSION, user);

/** Borrar un avance de la OB. */
export const canDeleteEmbroideryAvance = (user?: PermissionContext | null): boolean =>
  hasPermission(EMBROIDERY_DELETE_PERMISSION, user);
