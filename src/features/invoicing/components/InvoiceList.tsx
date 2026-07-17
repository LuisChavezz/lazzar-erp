"use client";

import { useState } from "react";
import { DataTable } from "@/src/components/DataTable";
import { Button } from "@/src/components/Button";
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
          <Button
            variant="primary"
            rounded="full"
            onClick={() => setIsCreateOpen(true)}
            className="hover:scale-105 active:scale-95"
          >
            + Nueva Factura
          </Button>
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
