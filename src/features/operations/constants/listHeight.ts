/**
 * Alto de los listados de Mesa de Control (Pedidos, Cotizaciones, Programados,
 * Clientes y Existencias/producción/compras). Dos modos, según la ventana:
 *
 * - **Ajustado** (ventana de al menos 1320px de ancho y 860px de alto): el
 *   panel (`MESA_CONTROL_LIST_HEIGHT`) mide la ventana menos lo que ocupa el
 *   cromo alrededor —header de la app, `ModuleNav` con su separación y el
 *   margen inferior del `<main>`: 172px medidos = `10.75rem`—, la zona de la
 *   tabla (`MESA_CONTROL_TABLE_REGION`) llena lo que dejan los KPIs/atajos y
 *   `DataTable` (`fillHeight`) scrollea por dentro: la página no scrollea.
 * - **Natural** (ventana más baja o más angosta): el panel recupera su altura
 *   natural, la zona de la tabla mide lo mismo que antes de ajustarla a la
 *   ventana —cuerpo `h-120` (30rem, ~7 filas de pedido) más toolbar, paginador
 *   y bordes: 141px— y la página scrollea.
 *
 * Por qué el umbral: en una laptop el cromo, los KPIs, el toolbar y el
 * paginador se comen casi toda la altura y el modo ajustado dejaba 0–1 filas
 * visibles (EC-749). Los números salen de Pedidos, el listado más alto:
 * - Alto: 172 (cromo) + 134 (KPIs y su separación) + 141 (toolbar, paginador,
 *   bordes) + 53 (encabezado) + 6 filas × 59 = 854px → 860px garantiza 6 filas.
 * - Ancho: por debajo de 1306px de ventana el contenedor de los KPIs baja de
 *   1100px (`@min-[68.75rem]` en `KpiGrid`), pasan a dos filas (+128px) y el
 *   modo ajustado volvería a mostrar ~4 filas; 1320px deja margen. Por debajo
 *   también quedan móvil y tableta, donde el `<main>` tiene otros márgenes y
 *   el `10.75rem` no aplica.
 *
 * Las clases van completas y literales (sin interpolar la media query) para
 * que Tailwind las detecte al escanear el código. Si cambias el umbral,
 * cámbialo en las dos constantes.
 */

/** Panel del listado: altura acotada a la ventana solo en el modo ajustado. */
export const MESA_CONTROL_LIST_HEIGHT =
  "[@media(min-width:1320px)_and_(min-height:860px)]:h-[calc(100dvh-10.75rem)]";

/**
 * Contenedor directo del `DataTable` (con `fillHeight`), hijo de un panel
 * `flex flex-col` con `MESA_CONTROL_LIST_HEIGHT`. Alto fijo de ~7 filas en el
 * modo natural; en el ajustado llena el resto del panel (`flex-1 min-h-0`).
 */
export const MESA_CONTROL_TABLE_REGION =
  "h-[calc(30rem+141px)] [@media(min-width:1320px)_and_(min-height:860px)]:h-auto [@media(min-width:1320px)_and_(min-height:860px)]:flex-1 [@media(min-width:1320px)_and_(min-height:860px)]:min-h-0";
