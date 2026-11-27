"use client";

import { useServerTable } from "@/src/hooks/useServerTable";
import { limitOffsetAdapter } from "@/src/utils/serverListAdapters";
import type { RfidReconciliationRow } from "../interfaces/rfid-reconciliation.interface";
import { getRfidReconciliationsPage } from "../services/actions";
import { RFID_RECONCILIATIONS_KEY } from "../constants/rfidReconciliations";
import { rfidReconciliationsTable } from "../constants/rfidReconciliationsTable";

// A nivel de módulo: una referencia estable entre renders.
const rfidReconciliationsAdapter = limitOffsetAdapter<RfidReconciliationRow>();

/** Listado de encuadres RFID en modo servidor (estado en la URL). */
export const useRfidReconciliationsTable = () =>
  useServerTable({
    definition: rfidReconciliationsTable,
    queryKey: RFID_RECONCILIATIONS_KEY,
    queryFn: getRfidReconciliationsPage,
    adapter: rfidReconciliationsAdapter,
    toastId: "rfid-reconciliations-table-refetch-error",
    refetchErrorMessage: "No se pudieron actualizar los encuadres. Se muestran los datos anteriores.",
  });
