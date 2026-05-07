"use client";

import { useMemo, useState } from "react";
import { DataTable } from "@/src/components/DataTable";
import { getColumns } from "./PurchaseOrderColumns";
import { usePurchaseOrders } from "../hooks/usePurchaseOrders";
import { ErrorState } from "@/src/components/ErrorState";
import { MainDialog } from "@/src/components/MainDialog";
import { DialogHeader } from "@/src/components/DialogHeader";
import { Button } from "@/src/components/Button";
import { PurchaseOrderForm } from "./PurchaseOrderForm";

export function PurchaseOrderList() {
  const { purchaseOrders, isLoading, isError, error, refetch, isFetching } =
    usePurchaseOrders();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const columns = useMemo(() => getColumns(), []);

  if (isLoading) {
    return (
      <div className="p-8 flex justify-center items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600" />
        <span className="ml-3 text-slate-500">Cargando órdenes de compra...</span>
      </div>
    );
  }

  if (isError) {
    return (
      <ErrorState
        title="Error al cargar órdenes de compra"
        message={(error as Error).message}
      />
    );
  }

  return (
    <DataTable
      columns={columns}
      data={purchaseOrders}
      title="Órdenes de Compra"
      searchPlaceholder="Buscar orden..."
      onRefetch={refetch}
      isRefetching={isFetching}
      actionButton={
        <MainDialog
          title={
            <DialogHeader
              title="Nueva Orden de Compra"
              subtitle="Registro Nuevo"
              statusColor="sky"
            />
          }
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          maxWidth="640px"
          trigger={
            <Button
              variant="primary"
              rounded="full"
              onClick={() => setIsDialogOpen(true)}
            >
              + Nueva Orden
            </Button>
          }
        >
          <PurchaseOrderForm onSuccess={() => setIsDialogOpen(false)} />
        </MainDialog>
      }
    />
  );
}

