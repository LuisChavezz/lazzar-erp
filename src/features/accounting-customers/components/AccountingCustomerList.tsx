"use client";

import { DataTable } from "@/src/components/DataTable";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { isInitialLoadError } from "@/src/utils/isInitialLoadError";
import { accountingCustomerColumns } from "./AccountingCustomerColumns";
import { useAccountingCustomers } from "../hooks/useAccountingCustomers";

export const AccountingCustomerList = () => {
  const { customers, hasLoaded, isLoading, isError, error, refetch, isFetching } =
    useAccountingCustomers();

  // Un error de refetch transitorio no debe descartar la tabla ya cargada;
  // solo se trata como error "de pantalla completa" si nunca cargó.
  const showError = isInitialLoadError(isError, hasLoaded);

  return (
    <DataTable
      columns={accountingCustomerColumns}
      data={customers}
      baseDataCount={customers.length}
      searchPlaceholder="Buscar por nombre, razón social, RFC o correo..."
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
