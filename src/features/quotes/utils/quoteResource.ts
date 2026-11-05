import { isAxiosError } from "axios";
import { isNotFoundOrForbiddenError } from "@/src/utils/drfWriteErrors";

/** Uno de los dos recursos que sirven una cotización por id. */
export type QuoteResource = "cotizaciones" | "mesa-control";

/**
 * Cómo se lee una cotización por id. Cada pantalla declara el suyo; no hay
 * valor por omisión, para que ninguna caiga en un respaldo sin pedirlo.
 *
 * - `"cotizaciones"`: `/ventas/cotizaciones/{id}/` —su empresa a cualquier
 *   estatus para `is_admin_empresa`/superuser; para los demás solo las que
 *   vendieron—. Es la de Ventas, la edición y el buscador global.
 * - `"mesa-control"`: `/ventas/mesa-control/{id}/` —empresa y estatus [2, 5]
 *   para admins y el departamento de mesa de control; nada para los demás—.
 *   Es la de las vistas de Mesa de Control, cuyas filas salen de ese alcance.
 * - `"cotizaciones-o-mesa-control"` / `"mesa-control-o-cotizaciones"`: el
 *   primero y, SOLO ante un 404, el segundo. Únicamente para las pantallas que
 *   abren una cotización sin poder saber cuál de los dos alcances le toca a
 *   quien mira (la pertenencia a mesa de control es un departamento y no viaja
 *   en la sesión): el pedido 360° (hasta EC-787) y la notificación
 *   `cotizacion_en_revision`, que eligen el orden.
 */
export type QuoteDetailSource =
  | QuoteResource
  | "cotizaciones-o-mesa-control"
  | "mesa-control-o-cotizaciones";

/** Recursos a los que se pregunta, en orden, para cada `source`. */
const QUOTE_RESOURCE_ORDER: Record<QuoteDetailSource, readonly QuoteResource[]> = {
  cotizaciones: ["cotizaciones"],
  "mesa-control": ["mesa-control"],
  "cotizaciones-o-mesa-control": ["cotizaciones", "mesa-control"],
  "mesa-control-o-cotizaciones": ["mesa-control", "cotizaciones"],
};

/**
 * Recurso del que se leen los comentarios de una cotización: el que sirvió su
 * detalle (`resolved`) en cuanto se sabe y, mientras tanto, el PRIMERO del
 * orden de `source`. Así arrancan en paralelo con el detalle también con
 * respaldo —en el caso común el primero responde—, y solo si el detalle se
 * resolvió por el segundo se vuelven a leer de ahí. Con un `source` fijo es
 * siempre ese recurso.
 */
export const quoteComentariosResource = (
  source: QuoteDetailSource,
  resolved: QuoteResource | undefined
): QuoteResource => resolved ?? QUOTE_RESOURCE_ORDER[source][0];

/**
 * Errores definitivos del detalle de una cotización: el 404 (no existe o no es
 * visible por los recursos de `source`, ya agotado su respaldo) y el 403. No
 * se reintentan, no conservan datos anteriores y el formulario de edición los
 * trata como denegación de acceso.
 */
export const isQuoteDetailDefinitiveError = isNotFoundOrForbiddenError;

export type QuoteResourceReaders<T> = Record<QuoteResource, (id: number) => Promise<T>>;

/** Lo leído y el recurso que lo sirvió. */
export interface QuoteResourceRead<T> {
  data: T;
  resource: QuoteResource;
}

/**
 * Lee por los recursos de `source`, en orden. Solo un 404 pasa al siguiente:
 * cualquier otro error (401, 403, 5xx, red) se propaga tal cual, y si el
 * último también da 404 se propaga ese error. Devuelve el recurso que
 * respondió para que lo que acompaña al detalle (sus comentarios) lea del
 * mismo, sin resolver el respaldo por su cuenta.
 */
export async function readQuoteResource<T>(
  readers: QuoteResourceReaders<T>,
  id: number,
  source: QuoteDetailSource
): Promise<QuoteResourceRead<T>> {
  const order = QUOTE_RESOURCE_ORDER[source];
  for (const [index, resource] of order.entries()) {
    try {
      return { data: await readers[resource](id), resource };
    } catch (error) {
      const isLast = index === order.length - 1;
      if (isLast || !isAxiosError(error) || error.response?.status !== 404) throw error;
    }
  }
  throw new Error(`QuoteDetailSource sin recursos: ${source}`);
}
