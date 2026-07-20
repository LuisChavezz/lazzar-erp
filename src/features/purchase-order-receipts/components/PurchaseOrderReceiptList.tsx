"use client";

import { DataTable } from "@/src/components/DataTable";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { isInitialLoadError } from "@/src/utils/isInitialLoadError";
import { purchaseOrderReceiptColumns } from "./PurchaseOrderReceiptColumns";
import { usePurchaseOrderReceipts } from "../hooks/usePurchaseOrderReceipts";

export const PurchaseOrderReceiptList = () => {
  const { receipts, hasLoaded, isLoading, isError, error, refetch, isFetching } =
    usePurchaseOrderReceipts();

  // Un refetch fallido transitorio no debe descartar la tabla ya cargada;
  // solo se trata como error "de pantalla completa" si nunca cargó.
  const showError = isInitialLoadError(isError, hasLoaded);

  return (
    <DataTable
      columns={purchaseOrderReceiptColumns}
      data={receipts}
      baseDataCount={receipts.length}
      searchPlaceholder="Buscar por folio, orden de compra o proveedor..."
      onRefetch={refetch}
      isRefetching={isFetching}
      isLoading={isLoading}
      isError={showError}
      errorTitle="Error al cargar las recepciones"
      errorMessage={extractErrorMessage(error, "No se pudo cargar la información.")}
      loadingAriaLabel="Cargando recepciones"
    />
  );
};
