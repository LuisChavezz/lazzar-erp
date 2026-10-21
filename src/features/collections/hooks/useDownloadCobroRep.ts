import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { useMutationLock } from "@/src/hooks/useMutationLock";
import { base64ToBlob } from "@/src/utils/base64ToBlob";
import { downloadBlob } from "@/src/utils/downloadBlob";
import { getCobroRepFile } from "../services/actions";
import type { Cobro, CobroRepFileFormat } from "../interfaces/collection.interface";
import {
  COBRO_REP_FILE_MIME,
  CobroRepFileUnreadableError,
  cobroRepFileName,
  downloadCobroRepErrorMessage,
} from "../utils/cobroRepDownload";

/** Candado de la descarga, ÚNICO por cobro y formato. */
export const downloadCobroRepMutationKey = (cobroId: number, format: CobroRepFileFormat) =>
  ["download-cobro-rep", cobroId, format] as const;

/**
 * Descarga el PDF o el XML del REP de UN cobro por el passthrough de Facturama.
 * Es de solo lectura: no toca la caché ni avisa al terminar bien (la descarga
 * del navegador ya es la confirmación); solo avisa el error. La mutación con
 * `mutationKey` por cobro y formato es el candado contra el doble clic.
 *
 * Quien lo usa ya comprobó `canDownloadCobroRep`; sin `rep_uuid` y
 * `rep_facturama_id` el disparador no hace nada.
 */
export const useDownloadCobroRep = (
  cobro: Pick<Cobro, "id" | "rep_uuid" | "rep_facturama_id">,
  format: CobroRepFileFormat,
) => {
  const mutationKey = downloadCobroRepMutationKey(cobro.id, format);
  const { isRunning, isIdle } = useMutationLock(mutationKey);

  const mutation = useMutation<void, unknown, { facturamaId: string; repUuid: string }>({
    mutationKey,
    mutationFn: async ({ facturamaId, repUuid }) => {
      const file = await getCobroRepFile(facturamaId, format);
      if (typeof file?.Content !== "string" || file.Content.trim() === "") {
        throw new CobroRepFileUnreadableError();
      }
      let blob: Blob;
      try {
        blob = base64ToBlob(file.Content, COBRO_REP_FILE_MIME[format]);
      } catch {
        throw new CobroRepFileUnreadableError();
      }
      downloadBlob(blob, cobroRepFileName(repUuid, format));
    },
    onError: (error) => {
      toast.error(downloadCobroRepErrorMessage(error));
    },
  });

  const download = () => {
    if (!cobro.rep_facturama_id || !cobro.rep_uuid || !isIdle()) return;
    mutation.mutate({ facturamaId: cobro.rep_facturama_id, repUuid: cobro.rep_uuid });
  };

  return { download, isDownloading: isRunning };
};
