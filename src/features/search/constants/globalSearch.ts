import type { ComponentType, SVGProps } from "react";
import {
  ClientesIcon,
  FacturacionIcon,
  PedidosIcon,
  SearchIcon,
} from "@/src/components/Icons";

/**
 * Longitud mínima para disparar la petición. El servidor manda el valor real en
 * `longitud_minima`, pero se necesita un piso ANTES de la primera respuesta;
 * este es el mismo valor documentado en el endpoint (2). Una vez hay respuesta,
 * la UI muestra el mínimo que dijo el servidor.
 */
export const SEARCH_MIN_QUERY_LENGTH = 2;

/**
 * Mínimo para que el backend busque también en los campos de NOMBRE. Por debajo
 * solo consulta códigos y folios; se usa solo para explicárselo al usuario
 * mientras no haya respuesta con `longitud_minima_nombre`.
 */
export const SEARCH_MIN_NAME_LENGTH = 3;

/** Resultados por grupo que se piden. El backend admite hasta 25. */
export const SEARCH_RESULTS_PER_GROUP = 5;

/**
 * 350 ms, igual que el buscador de etiquetas RFID: la búsqueda pega al SERVIDOR
 * (no filtra en cliente), así que se usa un intervalo mayor que el de un
 * filtrado local para no lanzar una petición por pulsación.
 */
export const SEARCH_DEBOUNCE_MS = 350;

/**
 * Cómo se ABRE cada entidad. Es el mapa `tipo → apertura` derivado de cómo se
 * llega hoy a cada detalle en la app:
 *
 *  - `pedido`     → ruta neutra `/orders/[id]` (la misma a la que navegan los
 *                   listados de Ventas, Mesa de Control, WMS, Compras y las
 *                   órdenes de Producción).
 *  - `cliente`    → ruta `/sales/customers/[id]` (único camino al detalle de
 *                   cliente en toda la app).
 *  - `cotizacion` → NO tiene ruta: su detalle es un diálogo self-fetching
 *                   (`QuoteDetailByIdDialog`), el mismo que abre el bloque
 *                   "Documentos relacionados" del pedido 360°.
 *
 * Un `tipo` ausente de este mapa es una entidad que el backend ya devuelve pero
 * el frontend todavía no sabe abrir: la fila se pinta (el backend la autorizó)
 * pero no es accionable, en vez de romper o navegar a una ruta inventada.
 */
export type SearchApertura = "ruta-pedido" | "ruta-cliente" | "dialogo-cotizacion";

export const SEARCH_APERTURA: Record<string, SearchApertura> = {
  pedido: "ruta-pedido",
  cliente: "ruta-cliente",
  cotizacion: "dialogo-cotizacion",
};

/**
 * `tipo` viene del servidor, así que se consulta con `Object.hasOwn` y no con el
 * indexado directo: un `tipo: "constructor"` (o `toString`, `valueOf`)
 * resolvería a una función heredada de `Object.prototype` —truthy— y la fila
 * parecería accionable. Mismo criterio que `CLICKABLE_DOC_TIPOS` en
 * `PedidoDetailContent`.
 */
export const getSearchApertura = (tipo: string): SearchApertura | null =>
  Object.hasOwn(SEARCH_APERTURA, tipo) ? SEARCH_APERTURA[tipo] : null;

/**
 * Ícono por entidad. `cotizacion` usa el glifo de documento (`FileText`) y no el
 * de pedidos —que el sidebar comparte entre ambas— porque en una lista mixta los
 * dos grupos deben distinguirse de un vistazo.
 */
const SEARCH_ENTITY_ICONS: Record<string, ComponentType<SVGProps<SVGSVGElement>>> = {
  pedido: PedidosIcon,
  cliente: ClientesIcon,
  cotizacion: FacturacionIcon,
};

/** Ícono de la entidad, con la lupa como neutro para tipos aún desconocidos. */
export const getSearchEntityIcon = (
  tipo: string,
): ComponentType<SVGProps<SVGSVGElement>> =>
  Object.hasOwn(SEARCH_ENTITY_ICONS, tipo) ? SEARCH_ENTITY_ICONS[tipo] : SearchIcon;
