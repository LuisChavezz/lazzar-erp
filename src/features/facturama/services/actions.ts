import { v1_api } from "@/src/api/v1.api";
import { SLOW_REQUEST_TIMEOUT_MS } from "@/src/constants/httpTimeouts";
import type { CfdiFileFormat, FacturamaCfdiFile } from "@/src/utils/officialCfdiFile";

/**
 * Archivo de un CFDI emitido por la empresa: el passthrough
 * `GET /finanzas/facturama/cfdi/{formato}/issued/{id}/` (EC-859). Solo pide
 * sesión: el backend acota `facturamaId` a facturas, notas de crédito y REP de
 * la empresa activa (otro → 404). Responde el objeto de Facturama tal cual
 * (`Content` en base64); lo decodifica `cfdiFileToBlob`. Una factura usa su
 * propio `cfdi/` (`getInvoiceCfdiFile`); la nota de crédito y el REP, este.
 * Tope lento (`SLOW_REQUEST_TIMEOUT_MS`): el backend lo pide a Facturama.
 */
export const getFacturamaCfdiFile = async (
  facturamaId: string,
  format: CfdiFileFormat,
): Promise<FacturamaCfdiFile> => {
  const { data } = await v1_api.get<FacturamaCfdiFile>(
    `/finanzas/facturama/cfdi/${format}/issued/${encodeURIComponent(facturamaId)}/`,
    { timeout: SLOW_REQUEST_TIMEOUT_MS },
  );
  return data;
};
