import { prefixedDocumentFileName } from "@/src/pdfs/shared/documentPdfFileName";
import { hasOfficialCfdi, type CfdiFileFormat } from "@/src/utils/officialCfdiFile";
import type { Cobro } from "../interfaces/collection.interface";

/**
 * ¿El REP del cobro está timbrado y se puede pedir su archivo? Hacen falta LOS
 * DOS campos (`hasOfficialCfdi`): el backend guarda `rep_facturama_id` aunque
 * Facturama responda sin UUID (timbrado pendiente), y ese id no es un REP
 * confirmado. Al cancelarse el REP el backend vacía los dos, así que un REP
 * cancelado ya no se descarga.
 *
 * No pide permiso aparte (EC-859): el passthrough solo exige sesión y que el
 * CFDI sea de la empresa activa, y quien ve el cobro ya pasó su lectura.
 */
export const hasCobroRepFile = (cobro: Pick<Cobro, "rep_uuid" | "rep_facturama_id">): boolean =>
  hasOfficialCfdi(cobro.rep_uuid, cobro.rep_facturama_id);

/**
 * Nombre del archivo del REP (EC-859): `REP-<folio del cobro>`, saneado como
 * los PDF de documentos (`COB-00016` → `REP-COB-00016.pdf`). Un REP solo se
 * timbra sobre un cobro `Aplicado`, que siempre tiene folio; sin él, por si
 * acaso, `REP-ID<id>`. El passthrough no manda nombre.
 */
export const cobroRepFileName = (cobro: Pick<Cobro, "id" | "folio">, format: CfdiFileFormat): string =>
  `${prefixedDocumentFileName("REP", cobro.folio, cobro.id)}.${format}`;
