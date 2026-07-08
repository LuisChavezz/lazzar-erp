"use client";

import { DataTable } from "@/src/components/DataTable";
import { ErrorState } from "@/src/components/ErrorState";
import { purchaseOrderReceiptColumns } from "./PurchaseOrderReceiptColumns";
import { usePurchaseOrderReceipts } from "../hooks/usePurchaseOrderReceipts";

export const PurchaseOrderReceiptList = () => {
  const { receipts, hasLoaded, isLoading, isError, error, refetch, isFetching } =
    usePurchaseOrderReceipts();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-100">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600" />
        <span className="ml-3 text-sm text-slate-500">
          Cargando recepciones...
        </span>
      </div>
    );
  }

  // Un refetch fallido transitorio no debe descartar la tabla ya cargada;
  // solo mostramos el error a pantalla completa si nunca cargó.
  if (isError && !hasLoaded) {
    return (
      <ErrorState
        title="Error al cargar las recepciones"
        message={(error as Error).message}
      />
    );
  }

  return (
    <DataTable
      columns={purchaseOrderReceiptColumns}
      data={receipts}
      baseDataCount={receipts.length}
      searchPlaceholder="Buscar por folio, orden de compra o proveedor..."
      onRefetch={refetch}
      isRefetching={isFetching}
    />
  );
};
