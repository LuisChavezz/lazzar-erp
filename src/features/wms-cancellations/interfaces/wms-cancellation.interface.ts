import type { DocumentCancellationFields } from "@/src/features/document-cancellation/interfaces/document-cancellation.interface";

/**
 * Quién, cuándo y por qué se canceló un documento de WMS (nucleo-erp #1348 y
 * EC-949): picking, packing, despacho y transferencia, en su listado y su
 * detalle. Cancelar no borra: el documento conserva su folio y queda en su
 * estado cancelado (picking `"Cancelado"`, packing y despacho `"CANCELADO"`,
 * TR `"CANCELADA"`).
 *
 * Son los campos de toda cancelación con motivo (`DocumentCancellationFields`,
 * EC-948); `cancelado_por_nombre` llega con EC-949, y un documento leído de una
 * versión anterior del backend no trae ninguno.
 */
export type WmsCancellationFields = DocumentCancellationFields;
