export const routePermissions = [
  { prefix: "/config", permission: "R-CONFIGURACION" },
  { prefix: "/system", permission: "R-CORE" },
  { prefix: "/sales", permission: "R-CRM" },
  { prefix: "/operations", permission: "R-MESACONTROL" },
  { prefix: "/wms", permission: "R-WMS" },
  { prefix: "/procurement", permission: "R-COMPRAS" },
  { prefix: "/manufacturing", permission: "R-PRODUCCION" },
  { prefix: "/finance", permission: "R-CONTABILIDAD" },
  { prefix: "/hr", permission: "R-RH" },
  { prefix: "/other", permission: "R-OTROS-MODULOS" },
];

/**
 * Mapa de redirección post-login ordenado por prioridad.
 *
 * Cuando un usuario inicia sesión, se evalúa este arreglo en orden:
 * el primer permiso que posea el usuario determina su ruta de redirección.
 *
 * Prioridad actual (de mayor a menor):
 *   1. R-CRM        → /sales       (CRM / Ventas)
 *   2. R-MESACONTROL → /operations  (Mesa de Control)
 *   3. R-WMS         → /wms         (WMS / Almacenes)
 *
 * Si el usuario no tiene ninguno de estos permisos, se redirige a "/".
 * Los usuarios con rol "admin" siempre van a "/" independientemente de sus permisos.
 */
export const loginRedirects: Array<{ permission: string; path: string }> = [
  { permission: "R-CRM", path: "/sales" },
  { permission: "R-MESACONTROL", path: "/operations" },
  { permission: "R-WMS", path: "/wms" },
];
