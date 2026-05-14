"use client";

import { useMemo, useState } from "react";
import { DataTable } from "@/src/components/DataTable";
import { getColumns } from "./PurchaseOrderColumns";
import { MainDialog } from "@/src/components/MainDialog";
import { DialogHeader } from "@/src/components/DialogHeader";
import { Button } from "@/src/components/Button";
import { PurchaseOrderMockForm } from "./PurchaseOrderMockForm";
import { MOCK_PURCHASE_ORDERS } from "../mocks/purchase-orders.mock";

export function PurchaseOrderList() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const columns = useMemo(() => getColumns(), []);

  return (
    <DataTable
      columns={columns}
      data={MOCK_PURCHASE_ORDERS}
      title="Órdenes de Compra"
      searchPlaceholder="Buscar orden, folio o referencia..."
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
          showCloseButton={false}
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
          <PurchaseOrderMockForm onSuccess={() => setIsDialogOpen(false)} />
        </MainDialog>
      }
    />
  );
}

