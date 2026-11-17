/**
 * Rutas de detalle de las cuatro órdenes de Producción. Cada una cuelga de su
 * sección, así que `canAccessRoute(<ruta>, user)` aplica la regla de
 * `routePermissions` de esa sección (`R-PRODUCCION-OP` / `-OB` / `-OR` / `-CM`):
 * quien enlaza a una orden desde fuera de su sección pregunta por la ruta, no
 * por el código (EC-895).
 */
export const productionOrderDetailPath = (id: number) => `/manufacturing/production-orders/${id}`;
export const embroideryOrderDetailPath = (id: number) => `/manufacturing/embroidery/${id}`;
export const reflectiveOrderDetailPath = (id: number) => `/manufacturing/reflective-orders/${id}`;
export const corteMangaOrderDetailPath = (id: number) => `/manufacturing/corte-manga/${id}`;
