"use client";

import { DataTable } from "@/src/components/DataTable";
import { purchaseQuoteColumns } from "./PurchaseQuoteColumns";
import { PURCHASE_ORDERS_DATA } from "@/src/features/quotes-menu/constants/quoteSampleData";

export default function PurchaseQuoteList() {
  return (
    <DataTable
      columns={purchaseQuoteColumns}
      data={PURCHASE_ORDERS_DATA}
      title="Órdenes de compra"
      searchPlaceholder="Buscar por orden o proveedor..."
    />
  );
}
