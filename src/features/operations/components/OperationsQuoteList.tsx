"use client";

import { useState } from "react";
import { useIsMutating } from "@tanstack/react-query";
import { DataTable } from "@/src/components/DataTable";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import {
  approveOperationsQuoteMutationKey,
} from "../hooks/useApproveOperationsQuote";
import {
  rejectOperationsQuoteMutationKey,
} from "../hooks/useRejectOperationsQuote";
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
} from "./OperationsQuoteColumns";

export const OperationsQuoteList = () => {
  const {
    operationsQuotes,
    isLoading,
    isInitialError,
    error,
    refetch,
    isFetching,
  } = useOperationsQuotes();
  const isAuthorizingOperationsQuote =
    useIsMutating({ mutationKey: approveOperationsQuoteMutationKey }) > 0;
  const isRejectingOperationsQuote =
    useIsMutating({ mutationKey: rejectOperationsQuoteMutationKey }) > 0;
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
    <OperationsQuoteRowActionsProvider value={requestAction}>
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