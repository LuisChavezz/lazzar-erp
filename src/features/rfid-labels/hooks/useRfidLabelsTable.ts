"use client";

import { useServerTable } from "@/src/hooks/useServerTable";
import { getEtiquetasRFIDPage } from "../services/actions";
import { RFID_LABELS_KEY } from "../constants/rfidLabelQueryKeys";
import { rfidLabelsTable } from "../constants/rfidLabelsTable";
import { rfidLabelsAdapter } from "../utils/rfidLabelsAdapter";

/**
 * Historial de impresiones RFID en modo servidor (estado en la URL). Consulta
 * bajo `["etiquetas-rfid", "list", params]`: el registro de una impresión
 * invalida `["etiquetas-rfid"]` y la relee.
 */
export const useRfidLabelsTable = () =>
  useServerTable({
    definition: rfidLabelsTable,
    queryKey: RFID_LABELS_KEY,
    queryFn: getEtiquetasRFIDPage,
    adapter: rfidLabelsAdapter,
    toastId: "etiquetas-rfid-table-refetch-error",
    refetchErrorMessage: "No se pudieron actualizar las impresiones. Se muestran los datos anteriores.",
  });
