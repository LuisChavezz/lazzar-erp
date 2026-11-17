"use client";

import { useMutation, type QueryKey } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { useMutationLock } from "@/src/hooks/useMutationLock";
import { downloadBlob } from "@/src/utils/downloadBlob";
import {
  cfdiFileToBlob,
  officialCfdiErrorMessage,
  type CfdiFileFormat,
} from "@/src/utils/officialCfdiFile";

/**
 * Descarga el archivo OFICIAL de un CFDI timbrado (EC-859): el PDF o XML de
 * Facturama, en base64, decodificado aquí (`cfdiFileToBlob`). Lo usan
 * "Descargar CFDI" de la factura y de la nota de crédito y la descarga del REP.
 *
 * Es de solo lectura: no toca la caché ni avisa al terminar bien (la descarga
 * del navegador ya es la confirmación); solo avisa el error. La mutación, con
 * `mutationKey` por documento y formato, es el candado contra el doble clic.
 */
export function useOfficialCfdiDownload({
  mutationKey,
  format,
  fetchFile,
  fileName,
  ofDocument,
}: {
  mutationKey: QueryKey;
  format: CfdiFileFormat;
  /** Pide el archivo al backend; `null` si el documento no tiene CFDI (el disparador no hace nada). */
  fetchFile: (() => Promise<unknown>) | null;
  fileName: string;
  /** Completa los mensajes de error: "del REP", "de la factura"… */
  ofDocument: string;
}) {
  const { isRunning, isIdle } = useMutationLock(mutationKey);

  const mutation = useMutation<void, unknown, () => Promise<unknown>>({
    mutationKey,
    mutationFn: async (fetcher) => {
      const file = await fetcher();
      downloadBlob(cfdiFileToBlob(file, format), fileName);
    },
    // Sin `toast.success` a propósito (decisión de producto del REP, EC-545): la descarga del navegador ya confirma.
    onError: (error) => {
      toast.error(officialCfdiErrorMessage(error, ofDocument));
    },
  });

  const download = () => {
    if (!fetchFile || !isIdle()) return;
    mutation.mutate(fetchFile);
  };

  return { download, isDownloading: isRunning };
}
