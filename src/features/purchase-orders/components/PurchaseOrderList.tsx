"use client";

import { DataTable } from "@/src/components/DataTable";
import { purchaseOrderColumns } from "./PurchaseOrderColumns";
import { PURCHASE_ORDERS_DATA } from "@/src/features/orders-menu/constants/orderSampleData";

export default function PurchaseOrderList() {
  return (
    <DataTable
      columns={purchaseOrderColumns}
      data={PURCHASE_ORDERS_DATA}
      title="Órdenes de compra"
      searchPlaceholder="Buscar por orden o proveedor..."
    />
  );
}
