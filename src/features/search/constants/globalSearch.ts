import type { ComponentType, SVGProps } from "react";
import {
  ClientesIcon,
  FacturacionIcon,
  PedidosIcon,
  ReceiptIcon,
  RulerIcon,
  ScissorsIcon,
  SearchIcon,
  SliceIcon,
} from "@/src/components/Icons";
import { invoiceDetailHref } from "@/src/features/invoicing/constants/invoiceDetailOrigins";
import type { PermissionContext } from "@/src/interfaces/permission-context.interface";
import { canAccessRoute } from "@/src/utils/routeAccess";

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
 * llega hoy a cada detalle en la app: por RUTA si la entidad tiene página de
 * detalle, o por el diálogo self-fetching que ya existe si no la tiene.
 *
 * Una apertura por ruta solo declara cómo se construye la URL desde el `id`;
 * la paleta la cierra y navega igual para todas. Los diálogos sí tienen cada
 * uno su propio montaje y secuencia en la paleta, así que van por nombre.
 *
 * Un `tipo` ausente de este mapa es una entidad que el backend ya devuelve pero
 * el frontend todavía no sabe abrir: la fila se pinta (el backend la autorizó)
 * pero no es accionable, en vez de romper o navegar a una ruta inventada.
 */
export type SearchApertura =
  | { modo: "ruta"; href: (id: number) => string }
  | { modo: "dialogo-cotizacion" };

export const SEARCH_APERTURA: Record<string, SearchApertura> = {
  // Ruta neutra `/orders/[id]`, la misma a la que navegan los listados de
  // Ventas, Mesa de Control, WMS, Compras y las órdenes de Producción.
  // `?from=home` es una llave declarada en `BACK_TARGETS` del detalle de pedido
  // y apunta al Home, el único destino que no exige permiso de módulo: desde la
  // búsqueda no hay un listado de origen al que volver —se puede abrir desde
  // cualquier ruta—, así que cualquier otra llave arriesgaría un "Volver" que
  // el proxy rebotaría.
  pedido: { modo: "ruta", href: (id) => `/orders/${id}?from=home` },
  // Único camino al detalle de cliente en toda la app.
  cliente: { modo: "ruta", href: (id) => `/sales/customers/${id}` },
  // Sin ruta de detalle: el diálogo self-fetching (`QuoteDetailByIdDialog`) que
  // abre el bloque "Documentos relacionados" del pedido 360°.
  cotizacion: { modo: "dialogo-cotizacion" },
  // Órdenes de producción: su página de detalle, sin `?from=`. El "Volver" es
  // fijo al listado del módulo, que exige el mismo código de sección que la
  // ruta y que el backend pide para mandar el grupo (`R-PRODUCCION-OB` / `-OR`
  // / `-CM`): todo el que recibe la fila puede abrir la ruta y volver.
  orden_bordado: { modo: "ruta", href: (id) => `/manufacturing/embroidery/${id}` },
  orden_reflejante: { modo: "ruta", href: (id) => `/manufacturing/reflective-orders/${id}` },
  orden_corte_manga: { modo: "ruta", href: (id) => `/manufacturing/corte-manga/${id}` },
  // Página de detalle de factura, sin `?from=` (mismo criterio que las órdenes
  // de producción): su "Volver" cae al listado de facturas, que exige el mismo
  // código que la ruta.
  factura: { modo: "ruta", href: (id) => invoiceDetailHref(id) },
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
 * ¿El usuario puede abrir la apertura? Una RUTA se evalúa con la misma regla
 * que el proxy (`canAccessRoute`, sin la query): el backend decide qué grupos
 * manda, pero con sus propios códigos —y deja pasar a `is_admin_empresa`, que
 * el frontend no conoce—, así que una fila recibida puede apuntar a una ruta
 * que rebotaría al Home. Esa fila se pinta pero no se abre. Un diálogo no
 * tiene regla de ruta: se abre como siempre.
 */
export const canOpenSearchApertura = (
  apertura: SearchApertura,
  id: number,
  user?: PermissionContext | null,
): boolean =>
  apertura.modo !== "ruta" || canAccessRoute(apertura.href(id).split("?")[0], user);

/**
 * Ícono por entidad. `cotizacion` usa el glifo de documento (`FileText`) y no el
 * de pedidos —que el sidebar comparte entre ambas— porque en una lista mixta los
 * dos grupos deben distinguirse de un vistazo. Por la misma razón `factura` usa
 * `Receipt` y no el `FileText` de su módulo (Facturación en el sidebar): ese
 * glifo ya es el de cotización aquí. `orden_bordado`, `orden_reflejante` y
 * `orden_corte_manga` usan el ícono de su módulo (tijeras, regla, rebanada).
 */
const SEARCH_ENTITY_ICONS: Record<string, ComponentType<SVGProps<SVGSVGElement>>> = {
  pedido: PedidosIcon,
  cliente: ClientesIcon,
  cotizacion: FacturacionIcon,
  orden_bordado: ScissorsIcon,
  orden_reflejante: RulerIcon,
  orden_corte_manga: SliceIcon,
  factura: ReceiptIcon,
};

/** Ícono de la entidad, con la lupa como neutro para tipos aún desconocidos. */
export const getSearchEntityIcon = (
  tipo: string,
): ComponentType<SVGProps<SVGSVGElement>> =>
  Object.hasOwn(SEARCH_ENTITY_ICONS, tipo) ? SEARCH_ENTITY_ICONS[tipo] : SearchIcon;
