"use client";

import { DataTable } from "@/src/components/DataTable";
import { ErrorState } from "@/src/components/ErrorState";
import { accountingCustomerColumns } from "./AccountingCustomerColumns";
import { useAccountingCustomers } from "../hooks/useAccountingCustomers";

export const AccountingCustomerList = () => {
  const { customers, hasLoaded, isLoading, isError, error, refetch, isFetching } =
    useAccountingCustomers();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-100">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600" />
        <span className="ml-3 text-sm text-slate-500">Cargando clientes...</span>
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
      columns={accountingCustomerColumns}
      data={customers}
      baseDataCount={customers.length}
      searchPlaceholder="Buscar por nombre, razón social, RFC o correo..."
      onRefetch={refetch}
      isRefetching={isFetching}
    />
  );
};
