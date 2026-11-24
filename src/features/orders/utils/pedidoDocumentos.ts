import type {
  PedidoDocumentoCobro,
  PedidoDocumentoDespacho,
  PedidoDocumentoFila,
  PedidoDocumentos,
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

/**
 * ¿El estatus de un documento ligado es el de cancelado? Cada documento tiene su
 * vocabulario (surtido `"Cancelado"`, embarque y envío `"CANCELADO"`), así que
 * se reconoce por la palabra, como el tono de `DocEstatusBadge`.
 */
export const isCancelledDocEstatus = (estatus: string | null | undefined): boolean =>
  typeof estatus === "string" && /cancel/i.test(estatus);

/** Cuántos de `items` están cancelados, leyendo su estatus con `estatusOf`. */
export const countCancelledDocs = <T>(items: readonly T[], estatusOf: (item: T) => string | null | undefined): number =>
  items.filter((item) => isCancelledDocEstatus(estatusOf(item))).length;

/**
 * Cancelados que un bloque con la forma común (`FilaBlock`) cuenta aparte: solo
 * si el bloque lo pide (Embarques, EC-945). Cotización, OC y órdenes de
 * producción siguen contando todas sus filas, como antes.
 */
export const filaBlockCancelledCount = (filas: readonly PedidoDocumentoFila[], countCancelledApart: boolean): number =>
  countCancelledApart ? countCancelledDocs(filas, filaEstatus) : 0;

/**
 * Escribe en los documentos del pedido el resultado de cancelar un despacho
 * desde su fila (EC-946): `estado` y `motivo_cancelacion` del despacho con ese
 * `id`, para que la fila deje de ofrecer "Cancelar" aunque la relectura que
 * sigue falle (EC-927). Devuelve la MISMA referencia si no hay nada que
 * escribir (otra forma, sin esa fila o sin `estado` en la respuesta).
 */
export const patchDocumentosDespacho = (
  docs: PedidoDocumentos | undefined,
  despacho: { id: number; estado?: string; motivo_cancelacion?: string } | null | undefined,
): PedidoDocumentos | undefined => {
  if (!docs || !Array.isArray(docs.despachos) || !despacho || typeof despacho.estado !== "string") {
    return docs;
  }
  if (!docs.despachos.some((fila) => fila.id === despacho.id)) return docs;
  const { estado, motivo_cancelacion } = despacho;
  return {
    ...docs,
    despachos: docs.despachos.map(
      (fila): PedidoDocumentoDespacho =>
        fila.id === despacho.id
          ? { ...fila, estado, ...(motivo_cancelacion !== undefined ? { motivo_cancelacion } : {}) }
          : fila,
    ),
  };
};
