"use client";

import { useState } from "react";
import { DataTable } from "@/src/components/DataTable";
import { invoiceColumns } from "./InvoiceColumns";
import { CreateInvoiceDialog } from "./CreateInvoiceDialog";
import { useInvoices } from "../hooks/useInvoices";
import { ErrorState } from "@/src/components/ErrorState";

export const InvoiceList = () => {
  const { invoices, hasLoaded, isLoading, isError, error, refetch, isFetching } =
    useInvoices();

  const [isCreateOpen, setIsCreateOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-100">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600" />
        <span className="ml-3 text-sm text-slate-500">Cargando facturas...</span>
      </div>
    );
  }

  // Solo mostramos el estado de error a pantalla completa cuando la consulta
  // nunca cargó con éxito; un error de refetch transitorio no debe descartar
  // la tabla ya cargada (perdiendo orden, paginación, búsqueda y filtros del
  // usuario), incluso si el conjunto cargado estaba vacío.
  if (isError && !hasLoaded) {
    return (
      <ErrorState
        title="Error al cargar las facturas"
        message={(error as Error).message}
      />
    );
  }

  return (
    <div className="space-y-6">
      <DataTable
        title="Facturación"
        columns={invoiceColumns}
        data={invoices}
        baseDataCount={invoices.length}
        searchPlaceholder="Buscar por folio, cliente o estatus..."
        onRefetch={refetch}
        isRefetching={isFetching}
        actionButton={
          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="px-4 py-2 cursor-pointer bg-sky-600 hover:bg-sky-700 text-white text-sm font-semibold rounded-full shadow-lg shadow-sky-500/30 transition-all hover:scale-105 active:scale-95 whitespace-nowrap"
          >
            + Nueva Factura
          </button>
        }
      />

      <CreateInvoiceDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onSuccess={() => setIsCreateOpen(false)}
      />
    </div>
  );
};
