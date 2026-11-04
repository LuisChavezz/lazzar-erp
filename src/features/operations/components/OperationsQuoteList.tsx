"use client";

import { useState } from "react";
import { useMutationState } from "@tanstack/react-query";
import { DataTable } from "@/src/components/DataTable";
import { MESA_CONTROL_LIST } from "@/src/features/operations/constants/listHeight";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { selectMutationRecordId } from "@/src/utils/mutationRecordId";
import { acceptChangesOperationsQuoteMutationKey } from "../hooks/useAcceptChangesOperationsQuote";
import { approveOperationsQuoteMutationKey } from "../hooks/useApproveOperationsQuote";
import { rejectChangesOperationsQuoteMutationKey } from "../hooks/useRejectChangesOperationsQuote";
import { rejectOperationsQuoteMutationKey } from "../hooks/useRejectOperationsQuote";
import { useOperationsQuotes } from "../hooks/useOperationsQuotes";
import type { OperationsQuote } from "../interfaces/operations-quote.interface";
import {
  OperationsQuoteActionDialogs,
  type OperationsQuoteDialogState,
} from "./OperationsQuoteActionDialogs";
import {
  buildOperationsQuoteFilterOptions,
  getOperationsQuoteColumns,
  OperationsQuoteRowActionsProvider,
  type OperationsQuoteRowAction,
  type OperationsQuoteRowBusy,
} from "./OperationsQuoteColumns";

/** Ids de cotización con una mutación `mutationKey` pendiente. */
function usePendingQuoteIds(mutationKey: readonly unknown[]): number[] {
  return useMutationState({
    filters: { mutationKey: [...mutationKey], status: "pending" },
    select: selectMutationRecordId,
  });
}

export const OperationsQuoteList = () => {
  const {
    operationsQuotes,
    isLoading,
    isInitialError,
    error,
    refetch,
    isFetching,
  } = useOperationsQuotes();
  // Trabajo en curso por fila, leído UNA vez de la caché de mutaciones (las
  // mutaciones viven en los diálogos) y repartido a las celdas por contexto.
  const busy: OperationsQuoteRowBusy = {
    authorize: usePendingQuoteIds(approveOperationsQuoteMutationKey),
    reject: usePendingQuoteIds(rejectOperationsQuoteMutationKey),
    acceptChanges: usePendingQuoteIds(acceptChangesOperationsQuoteMutationKey),
    rejectChanges: usePendingQuoteIds(rejectChangesOperationsQuoteMutationKey),
  };
  const isAuthorizingOperationsQuote = busy.authorize.length > 0;
  const isRejectingOperationsQuote = busy.reject.length > 0;
  const isUpdatingOperationsQuoteStatus =
    isAuthorizingOperationsQuote || isRejectingOperationsQuote;
  // Acción pedida desde una celda (ver, autorizar, rechazar, aceptar/rechazar
  // cambios). El estado vive aquí, no en la fila: la acción puede sacar la fila
  // del listado y el diálogo sigue.
  const [dialog, setDialog] = useState<OperationsQuoteDialogState | null>(null);
  const requestAction = (kind: OperationsQuoteRowAction, operationsQuote: OperationsQuote) =>
    setDialog({ kind, operationsQuote });

  return (
    // Altura según la ventana (`listHeight.ts`): en pantallas altas la tabla
    // llena el panel y scrollea por dentro; en laptops mide ~7 filas y la
    // página scrollea.
    <OperationsQuoteRowActionsProvider value={{ requestAction, busy }}>
    <div className={`${MESA_CONTROL_LIST.panel} flex flex-col`}>
      <div className={MESA_CONTROL_LIST.region}>
      <DataTable
        columns={getOperationsQuoteColumns(buildOperationsQuoteFilterOptions(operationsQuotes))}
        data={operationsQuotes}
        baseDataCount={operationsQuotes.length}
        searchPlaceholder="Buscar cotización operativa..."
        fillHeight
        fillHeightBodyClassName={MESA_CONTROL_LIST.body}
        onRefetch={refetch}
        isRefetching={isFetching}
        isLoadingOverlay={isUpdatingOperationsQuoteStatus}
        loadingTitle={
          isRejectingOperationsQuote
            ? "Rechazando cotización operativa"
            : "Autorizando cotización operativa"
        }
        loadingMessage="Estamos actualizando el estado de la cotización operativa."
        isLoading={isLoading}
        isError={isInitialError}
        errorTitle="Error al cargar cotizaciones operativas"
        errorMessage={extractErrorMessage(error, "No se pudo cargar la información.")}
        loadingAriaLabel="Cargando cotizaciones operativas"
      />
      </div>
      <OperationsQuoteActionDialogs
        dialog={dialog}
        onClose={() => setDialog(null)}
        operationsQuotes={operationsQuotes}
      />
    </div>
    </OperationsQuoteRowActionsProvider>
  );
};