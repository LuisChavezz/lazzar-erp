import axios from "axios";
import { v1_api } from "@/src/api/v1.api";
import type { CfdiFileFormat, FacturamaCfdiFile } from "@/src/utils/officialCfdiFile";
import { VerifyRfcResponse } from "../interfaces/facturama.interface";

/**
 * Verifica el estado fiscal de un RFC contra el servicio de Facturama.
 * Esta función se ejecuta del lado cliente y llama al proxy interno
 * que protege las credenciales de Facturama.
 */
export const verifyRfc = async (rfc: string): Promise<VerifyRfcResponse> => {
  try {
    const response = await axios.get<VerifyRfcResponse>("/api/facturama/customers/status", {
      params: {
        rfc,
      },
    });

    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const message =
        typeof error.response?.data === "object" &&
        error.response?.data &&
        "error" in error.response.data &&
        typeof error.response.data.error === "string"
          ? error.response.data.error
          : "No se pudo validar el RFC en este momento.";

      throw new Error(message);
    }

    throw error;
  }
};

/**
 * Archivo de un CFDI emitido por la empresa: el passthrough
 * `GET /finanzas/facturama/cfdi/{formato}/issued/{id}/` (EC-859). Solo pide
 * sesión: el backend acota `facturamaId` a facturas, notas de crédito y REP de
 * la empresa activa (otro → 404). Responde el objeto de Facturama tal cual
 * (`Content` en base64); lo decodifica `cfdiFileToBlob`. Una factura usa su
 * propio `cfdi/` (`getInvoiceCfdiFile`); la nota de crédito y el REP, este.
 */
export const getFacturamaCfdiFile = async (
  facturamaId: string,
  format: CfdiFileFormat,
): Promise<FacturamaCfdiFile> => {
  const { data } = await v1_api.get<FacturamaCfdiFile>(
    `/finanzas/facturama/cfdi/${format}/issued/${encodeURIComponent(facturamaId)}/`,
  );
  return data;
};
