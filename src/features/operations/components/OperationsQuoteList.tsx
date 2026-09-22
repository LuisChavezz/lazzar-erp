"use client";

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
import { operationsQuoteColumns } from "./OperationsQuoteColumns";

export const OperationsQuoteList = () => {
  const {
    operationsQuotes,
    isLoading,
    isError,
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

  return (
    // Altura acotada a la ventana (mismo cálculo que el resto de Mesa de
    // Control: 128px = header + padding inferior del `<main>` scrolleable) +
    // `fillHeight` en `DataTable` para que la tabla scrollee INTERNAMENTE en
    // vez de empujar la página — esta pantalla no tiene tarjetas KPI arriba,
    // así que no hace falta acotar solo desde `md:`.
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
        isError={isError}
        errorTitle="Error al cargar cotizaciones operativas"
        errorMessage={extractErrorMessage(error, "No se pudo cargar la información.")}
        loadingAriaLabel="Cargando cotizaciones operativas"
      />
    </div>
  );
};