/**
 * ¿`pathname` cae bajo `prefix`? Coincide la ruta exacta o una sub-ruta
 * (`prefix/...`), nunca un prefijo que solo comparte letras: `/sales` cubre
 * `/sales` y `/sales/quotes`, pero no `/salesforce`.
 *
 * Es la regla única de coincidencia de rutas de la app: la usan el proxy de
 * permisos (`findRoutePermissionRule`), el gate de empresa
 * (`companyGatedRoutes`), el sidebar y la navegación de módulo. Cambiarla aquí
 * la cambia en todos a la vez, para que nunca discrepen sobre la misma ruta.
 */
export const matchesRoutePrefix = (pathname: string, prefix: string): boolean =>
  pathname === prefix || pathname.startsWith(`${prefix}/`);
