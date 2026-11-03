/**
 * Alto de un listado de Mesa de Control: la ventana menos el header, la
 * `ModuleNav` y los márgenes del `<main>` (mismo cálculo que Compras, ver
 * `procurement/orders/page.tsx`). Con `fillHeight` en `DataTable`, la tabla
 * scrollea por dentro y la página nunca.
 */
export const MESA_CONTROL_LIST_HEIGHT = "h-[calc(100dvh-13rem)] min-h-[420px]";
