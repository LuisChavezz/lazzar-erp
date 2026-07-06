"use client";

import { DataTable } from "@/src/components/DataTable";
import { ErrorState } from "@/src/components/ErrorState";
import { Loader } from "@/src/components/Loader";
import { operationsCustomerColumns } from "./OperationsCustomerColumns";
import { useOperationsCustomers } from "../hooks/useOperationsCustomers";

export const OperationsCustomerList = () => {
  const { customers, hasLoaded, isLoading, isError, error, refetch, isFetching } =
    useOperationsCustomers();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-100">
        <Loader title="Cargando clientes" message="Obteniendo información de clientes..." />
      </div>
    );
  }

  // Un error de refetch transitorio no debe descartar la tabla ya cargada;
  // solo mostramos el estado de error a pantalla completa si nunca cargó.
  if (isError && !hasLoaded) {
    return (
      <ErrorState
        title="Error al cargar los clientes"
        message={(error as Error).message}
      />
    );
  }

  return (
    <DataTable
      columns={operationsCustomerColumns}
      data={customers}
      searchPlaceholder="Buscar por nombre, razón social, RFC o contacto..."
      onRefetch={refetch}
      isRefetching={isFetching}
    />
  );
};
