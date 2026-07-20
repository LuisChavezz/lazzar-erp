"use client";

import { DataTable } from "@/src/components/DataTable";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { isInitialLoadError } from "@/src/utils/isInitialLoadError";
import { operationsCustomerColumns } from "./OperationsCustomerColumns";
import { useOperationsCustomers } from "../hooks/useOperationsCustomers";

export const OperationsCustomerList = () => {
  const { customers, hasLoaded, isLoading, isError, error, refetch, isFetching } =
    useOperationsCustomers();

  // Un error de refetch transitorio no debe descartar la tabla ya cargada;
  // solo se trata como error "de pantalla completa" si nunca cargó.
  const showError = isInitialLoadError(isError, hasLoaded);

  return (
    <DataTable
      columns={operationsCustomerColumns}
      data={customers}
      searchPlaceholder="Buscar por nombre, razón social, RFC o contacto..."
      onRefetch={refetch}
      isRefetching={isFetching}
      isLoading={isLoading}
      isError={showError}
      errorTitle="Error al cargar los clientes"
      errorMessage={extractErrorMessage(error, "No se pudo cargar la información.")}
      loadingAriaLabel="Cargando clientes"
    />
  );
};
