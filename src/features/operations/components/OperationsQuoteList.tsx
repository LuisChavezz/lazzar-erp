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
import { operationsQuoteColumns, OperationsQuoteRejectProvider } from "./OperationsQuoteColumns";
import { RejectQuoteDialog } from "./RejectQuoteDialog";

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
  // Cotización cuyo rechazo se pidió desde una celda. La foto vive aquí, no en
  // la fila: tras rechazar, la fila sale del listado y el diálogo sigue.
  const [rejectTarget, setRejectTarget] = useState<OperationsQuote | null>(null);

  return (
    // Altura acotada a la ventana (mismo cálculo que el resto de Mesa de
    // Control: 128px = header + padding inferior del `<main>` scrolleable) +
    // `fillHeight` en `DataTable` para que la tabla scrollee INTERNAMENTE en
    // vez de empujar la página — esta pantalla no tiene tarjetas KPI arriba,
    // así que no hace falta acotar solo desde `md:`.
    <OperationsQuoteRejectProvider value={setRejectTarget}>
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
      {rejectTarget && (
        <RejectQuoteDialog
          key={rejectTarget.id}
          quote={rejectTarget}
          onClose={() => setRejectTarget(null)}
        />
      )}
    </div>
    </OperationsQuoteRejectProvider>
  );
};