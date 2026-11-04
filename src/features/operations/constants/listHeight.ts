/**
 * Alto de los listados de Mesa de Control (Pedidos, Cotizaciones, Programados,
 * Clientes y Existencias/producción/compras). Dos modos, según la ventana:
 *
 * - **Ajustado**: el panel mide la ventana menos el cromo alrededor —header de
 *   la app, `ModuleNav` con su separación y el margen inferior del `<main>`:
 *   172px medidos = `10.75rem`—, la zona de la tabla llena lo que dejan los
 *   KPIs/atajos y `DataTable` (`fillHeight`) scrollea por dentro: la página no
 *   scrollea.
 * - **Natural**: el panel tiene su altura natural, el cuerpo de la tabla mide
 *   `h-120` (30rem, lo mismo que antes de ajustarlo a la ventana; ~7 filas de
 *   pedido) sin importar lo que mida el toolbar, y la página scrollea. Sin
 *   datos base la tabla colapsa (ver `fillHeightBodyClassName` en `DataTable`).
 *
 * Por qué hay umbral: en una laptop el cromo, los KPIs, el toolbar y el
 * paginador se comían casi toda la altura y el modo ajustado dejaba 0–1 filas
 * visibles (EC-749). Cada listado entra al modo ajustado solo donde sigue
 * mostrando ~6 filas completas. Los umbrales son variantes de Tailwind
 * definidas en `src/app/globals.css`:
 *
 * - `mesa-fit` (listados sin KPIs): ventana desde `lg` (1024px; por debajo el
 *   toolbar se apila y en móvil el `<main>` tiene otros márgenes) y desde
 *   810px de alto. Altura de ventana medida para 6 filas completas, en el
 *   peor ancho y con la barra lateral anclada o colapsada: Clientes 805px (sus
 *   filas se parten en dos líneas en anchos angostos), Cotizaciones ~768,
 *   Programados 725, Existencias 703. Sin KPIs ni cuenta del ancho del
 *   listado: nada encima de la tabla cambia de alto con él.
 * - `mesa-fit-kpi` (Pedidos): 860px de alto —172 (cromo) + 134 (KPIs y su
 *   separación) + 141 (toolbar, paginador y bordes) + 53 (encabezado) + 6 filas
 *   × 59 = 854px— y el listado de al menos 68.75rem (1100px) de ANCHO, medido
 *   con la container query `mesa-list`: por debajo los KPIs pasan a dos filas
 *   (+128px) y el ajustado volvería a ~4 filas. Se mide el listado y no el
 *   viewport porque la barra lateral anclada (`w-72`) le quita 208px respecto
 *   a la colapsada (`w-20`).
 */

/** Clases de un listado sin KPIs (`mesa-fit`). */
export const MESA_CONTROL_LIST = {
  /** Panel `flex flex-col`: altura acotada a la ventana solo en el ajustado. */
  panel: "mesa-fit:h-[calc(100dvh-10.75rem)]",
  /** Contenedor directo del `DataTable`: llena el panel en el ajustado. */
  region: "mesa-fit:flex-1 mesa-fit:min-h-0",
  /** `fillHeightBodyClassName` del `DataTable`: `h-120` en el natural. */
  body: "h-120 shrink-0 mesa-fit:h-auto mesa-fit:flex-1 mesa-fit:min-h-0",
} as const;

/**
 * Clases de Pedidos (`mesa-fit-kpi`). `container` va en un ancestro del panel
 * con ancho real (flujo de bloque): es el que mide la container query.
 */
export const MESA_CONTROL_KPI_LIST = {
  container: "@container/mesa-list",
  panel: "mesa-fit-kpi:h-[calc(100dvh-10.75rem)]",
  region: "mesa-fit-kpi:flex-1 mesa-fit-kpi:min-h-0",
  body: "h-120 shrink-0 mesa-fit-kpi:h-auto mesa-fit-kpi:flex-1 mesa-fit-kpi:min-h-0",
} as const;
