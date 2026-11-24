import type { DocumentPdfDescriptor } from "@/src/pdfs/shared/documentPdfModel";

/**
 * `cancellationReason` del PDF de un documento de WMS cancelado (EC-945): su
 * `motivo_cancelacion` (#1348), solo si está cancelado y lo trae. Sin motivo no
 * se agrega la llave, así que el descriptor de siempre no cambia.
 */
export const wmsPdfCancellationReason = (
  cancelled: boolean,
  motivo: string | null | undefined,
): Pick<DocumentPdfDescriptor, "cancellationReason"> =>
  cancelled && motivo?.trim() ? { cancellationReason: motivo.trim() } : {};
