import type {
  PedidoDocumentoCobro,
  PedidoDocumentoFila,
} from "../interfaces/pedido-documentos.interface";

/**
 * Folio visible de una fila de los bloques con forma común de `documentos/`
 * (EC-920). La cotización no tiene folio (llega `null`): se muestra su id, como
 * lo hacía la antigua sección "Documentos relacionados" (que recibía `str(pk)`).
 */
export const filaFolio = (fila: PedidoDocumentoFila): string => fila.folio || String(fila.id);

/** Estatus visible de esa fila: su etiqueta, o el valor guardado si no la trae. */
export const filaEstatus = (fila: PedidoDocumentoFila): string | null =>
  fila.estatus_label ?? (fila.estatus === null ? null : String(fila.estatus));

/**
 * Llave de una fila de cobro: el backend manda una por aplicación
 * (`CobroDetalle`), así que un mismo cobro aplicado a dos facturas llega dos
 * veces con el mismo `cobro_id` y distinto `factura_folio`.
 */
export const cobroRowKey = (cobro: PedidoDocumentoCobro, index: number): string =>
  `${cobro.cobro_id}-${cobro.factura_folio ?? `sin-folio-${index}`}`;
