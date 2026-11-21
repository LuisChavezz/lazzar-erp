import { isSalidaMaquilaAbierta } from "../constants/salidaMaquilaStatus";
import type { SalidaMaquila, SalidaMaquilaListItem } from "../interfaces/salida-maquila.interface";

/** `Recepcion.EstatusRecepcion.CANCELADA` (nucleo-erp, compras/models.py). */
export const RECEPCION_CANCELADA = 6;

/** Estatus de factura de proveedor cancelada, tal cual el backend. */
export const FACTURA_CANCELADA = "Cancelada";

/** Folio de una recepción o factura de la SM, o `#id` si aún no tiene. */
export const salidaMaquilaDocumentoEtiqueta = (doc: { id: number; folio: string | null }): string =>
  doc.folio?.trim() || `#${doc.id}`;

/** ¿La SM ya regresó (algo) con una recepción que no está cancelada? */
export const tieneRecepcionViva = (salida: Pick<SalidaMaquila, "recepciones">): boolean =>
  (salida.recepciones ?? []).some((r) => r.estatus !== RECEPCION_CANCELADA);

/**
 * ¿Se ofrece "Cancelar salida"? Solo una SM Enviada SIN recepciones vivas
 * (EC-919): si ya regresó algo, lo que falta se cierra desde la recepción
 * ("Cerrar la SM con faltante"), y cancelarla dejaría su factura de maquila en
 * Borrador. Sin `recepciones` en la respuesta no hay con qué decidir: se
 * ofrece como antes y decide el backend.
 */
export const puedeCancelarSalidaMaquila = (
  salida: Pick<SalidaMaquilaListItem, "estatus"> & Pick<SalidaMaquila, "recepciones">,
): boolean => isSalidaMaquilaAbierta(salida.estatus) && !tieneRecepcionViva(salida);
