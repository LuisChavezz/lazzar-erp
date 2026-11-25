import type { DocumentPdfDescriptor } from "@/src/pdfs/shared/documentPdfModel";
import { formatShortDateTime } from "@/src/utils/formatDate";
import type { DocumentCancellationFields } from "../interfaces/document-cancellation.interface";

/**
 * Motivo y "quién y cuándo" del PDF de un documento cancelado (EC-948), desde
 * sus datos de cancelación: solo si está cancelado, y solo lo que trae. Sin
 * nada no se agrega ninguna llave, así que el descriptor de siempre no cambia
 * (un documento cancelado antes de nucleo-erp#1355 lleva solo la marca). La
 * fecha va en la zona de México (`formatShortDateTime`).
 */
export const cancellationPdfFields = (
  cancelled: boolean,
  fields: DocumentCancellationFields,
): Pick<DocumentPdfDescriptor, "cancellationReason" | "cancellationDetail"> => {
  if (!cancelled) return {};
  const result: Pick<DocumentPdfDescriptor, "cancellationReason" | "cancellationDetail"> = {};
  const motivo = fields.motivo_cancelacion?.trim();
  if (motivo) result.cancellationReason = motivo;
  const parts: string[] = [];
  const nombre = fields.cancelado_por_nombre?.trim();
  if (nombre) parts.push(`Canceló: ${nombre}`);
  const fecha = formatShortDateTime(fields.fecha_cancelacion);
  if (fecha !== "—") parts.push(`Fecha: ${fecha}`);
  if (parts.length > 0) result.cancellationDetail = parts.join(" · ");
  return result;
};
