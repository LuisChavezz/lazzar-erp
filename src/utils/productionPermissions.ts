import type { PermissionContext } from "../interfaces/permission-context.interface";
import { hasPermission } from "./permissions";

/** Secciones de Producción con código propio. El código es `CM`, nunca `OCM`. */
export type ProductionSection = "OP" | "OB" | "OR" | "CM";

/** Acciones de escritura: crear, editar y borrar o cancelar (destructivo). */
export type ProductionWriteAction = "C" | "E" | "D";

/**
 * Códigos de escritura de Producción por sección y acción (EC-895), los que el
 * backend exigirá (EC-899):
 * - `C`: dar de alta (incluye "Crear OP" desde una pre-orden y el resurtido).
 * - `E`: editar la ficha, registrar avances, cambiar estatus, ruta crítica y
 *   recálculo de consumos.
 * - `D`: acciones destructivas: borrar un avance, cancelar una OP.
 *
 * Única tabla de estos códigos en el frontend: no se escriben como literales.
 */
export const PRODUCTION_WRITE_PERMISSIONS = {
  OP: { C: "C-PRODUCCION-OP", E: "E-PRODUCCION-OP", D: "D-PRODUCCION-OP" },
  OB: { C: "C-PRODUCCION-OB", E: "E-PRODUCCION-OB", D: "D-PRODUCCION-OB" },
  OR: { C: "C-PRODUCCION-OR", E: "E-PRODUCCION-OR", D: "D-PRODUCCION-OR" },
  CM: { C: "C-PRODUCCION-CM", E: "E-PRODUCCION-CM", D: "D-PRODUCCION-CM" },
} as const satisfies Record<ProductionSection, Record<ProductionWriteAction, string>>;

/**
 * Ver costos de producción (nucleo-erp #1135): el backend omite el
 * `costo_maquila_unitario` de la OP sin él, y omitirá los importes de la salida
 * a maquila (`precio_unitario`, `importe`, `total`).
 */
export const PRODUCTION_COSTS_PERMISSION = "R-PRODUCCION-COSTOS";

/** ¿Ve `user` los costos de producción? El rol "admin" pasa siempre (`hasPermission`). */
export const canSeeProductionCosts = (user: PermissionContext | null | undefined): boolean =>
  hasPermission(PRODUCTION_COSTS_PERMISSION, user);

/**
 * ¿Puede `user` hacer `action` en `section`? Con la misma regla que el resto de
 * la app y el proxy (`hasPermission`): el rol "admin" (superusuario o admin de
 * empresa) pasa siempre.
 */
export const hasProductionPermission = (
  user: PermissionContext | null | undefined,
  section: ProductionSection,
  action: ProductionWriteAction,
): boolean => hasPermission(PRODUCTION_WRITE_PERMISSIONS[section][action], user);
