import { getFacturamaCfdiFile } from "@/src/features/facturama/services/actions";
import { useOfficialCfdiDownload } from "@/src/hooks/useOfficialCfdiDownload";
import type { CfdiFileFormat } from "@/src/utils/officialCfdiFile";
import type { Cobro } from "../interfaces/collection.interface";
import { cobroRepFileName, hasCobroRepFile } from "../utils/cobroRepDownload";

/** Candado de la descarga, ÚNICO por cobro y formato. */
export const downloadCobroRepMutationKey = (cobroId: number, format: CfdiFileFormat) =>
  ["download-cobro-rep", cobroId, format] as const;

/**
 * Descarga el PDF o el XML del REP de UN cobro por el passthrough de Facturama
 * (`useOfficialCfdiDownload`), como `REP-<folio del cobro>`. Sin REP timbrado
 * (`hasCobroRepFile`) el disparador no hace nada.
 */
export const useDownloadCobroRep = (
  cobro: Pick<Cobro, "id" | "folio" | "rep_uuid" | "rep_facturama_id">,
  format: CfdiFileFormat,
) => {
  const facturamaId = cobro.rep_facturama_id;
  return useOfficialCfdiDownload({
    mutationKey: downloadCobroRepMutationKey(cobro.id, format),
    format,
    fetchFile: hasCobroRepFile(cobro) && facturamaId ? () => getFacturamaCfdiFile(facturamaId, format) : null,
    fileName: cobroRepFileName(cobro, format),
    ofDocument: "del REP",
  });
};
