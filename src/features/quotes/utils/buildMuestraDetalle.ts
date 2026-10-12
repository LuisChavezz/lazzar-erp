import type { QuoteMuestraDetail } from "../interfaces/quote.interface";
import type { QuoteMuestraItem } from "../schemas/quote-item.schema";

/**
 * Renglón de `detalle` de una partida de MUESTRA, compartido por el alta
 * (`useQuoteForm`) y la edición (`useQuoteEditForm`) para que un campo nuevo no
 * pueda añadirse a una sola de las dos: la edición borra y recrea el detalle,
 * así que lo que no se reenvía se pierde.
 *
 * `categoria_producto` se omite solo cuando la muestra no tiene categoría
 * (muestras anteriores al campo, que solo existen en edición).
 */
export const buildMuestraDetalle = (
  item: QuoteMuestraItem,
  tallas: QuoteMuestraDetail["tallas"],
  precio_unitario: string,
): QuoteMuestraDetail => ({
  producto: null,
  producto_nombre_externo: item.producto_nombre_externo,
  ...(item.categoria_producto != null && {
    categoria_producto: item.categoria_producto,
  }),
  precio_unitario,
  tallas,
});
