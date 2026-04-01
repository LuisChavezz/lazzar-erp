"use client";

import { DataTable } from "@/src/components/DataTable";
import { productionQuoteColumns } from "./ProductionQuoteColumns";
import { PRODUCTION_ORDERS_DATA } from "@/src/features/quotes-menu/constants/quoteSampleData";

export default function ProductionQuoteList() {
  return (
    <DataTable
      columns={productionQuoteColumns}
      data={PRODUCTION_ORDERS_DATA}
      title="Órdenes de producción"
      searchPlaceholder="Buscar por pedido o cliente..."
    />
  );
}
