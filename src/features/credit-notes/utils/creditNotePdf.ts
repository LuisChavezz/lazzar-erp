import type { DocumentPdfDescriptor } from "@/src/pdfs/shared/documentPdfModel";
import { hasOfficialCfdi } from "@/src/utils/officialCfdiFile";
import type { NotaCredito } from "../interfaces/credit-note.interface";

/**
 * Identidad de una nota de crédito para su PDF (EC-859): código `NC`. El folio
 * lo captura el usuario (no hay serie), así que puede venir vacío
 * (`NC-ID<id>.pdf`) o traer ya el segmento `NC` (`NC-EC639-A.pdf`).
 *
 * La marca sale solo con `Cancelada` y dice "CANCELADA". El `motivo` de la nota
 * es el del crédito, no el de una cancelación, así que no se imprime como
 * motivo de cancelación (va en los datos de la nota).
 */
export const creditNotePdfDescriptor = (nota: Pick<NotaCredito, "id" | "folio" | "estatus">): DocumentPdfDescriptor => {
  const cancelled = nota.estatus === "Cancelada";
  return {
    type: "NC",
    id: nota.id,
    folio: nota.folio,
    cancelled,
    ...(cancelled ? { cancelledLabel: "CANCELADA" } : {}),
  };
};

/** ¿La nota tiene CFDI de egreso timbrado que se pueda descargar ("Descargar CFDI")? */
export const hasCreditNoteCfdi = (nota: Pick<NotaCredito, "cfdi_uuid" | "facturama_id">): boolean =>
  hasOfficialCfdi(nota.cfdi_uuid, nota.facturama_id);
