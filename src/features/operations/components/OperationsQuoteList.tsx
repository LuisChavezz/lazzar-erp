"use client";

import { useState } from "react";
import { useMutationState } from "@tanstack/react-query";
import { DataTable } from "@/src/components/DataTable";
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
  operationsQuoteColumns,
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
    // Altura acotada a la ventana (mismo cálculo que el resto de Mesa de
    // Control: 128px = header + padding inferior del `<main>` scrolleable) +
    // `fillHeight` en `DataTable` para que la tabla scrollee INTERNAMENTE en
    // vez de empujar la página — esta pantalla no tiene tarjetas KPI arriba,
    // así que no hace falta acotar solo desde `md:`.
    <OperationsQuoteRowActionsProvider value={{ requestAction, busy }}>
    <div className="h-[calc(100dvh-128px)] min-h-[420px]">
      <DataTable
        columns={operationsQuoteColumns}
        data={operationsQuotes}
        baseDataCount={operationsQuotes.length}
        searchPlaceholder="Buscar cotización operativa..."
        fillHeight
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
      <OperationsQuoteActionDialogs
        dialog={dialog}
        onClose={() => setDialog(null)}
        operationsQuotes={operationsQuotes}
      />
    </div>
    </OperationsQuoteRowActionsProvider>
  );
};