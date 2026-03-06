"use client";

import { DataTable } from "@/src/components/DataTable";
import { productionOrderColumns } from "./ProductionOrderColumns";
import { PRODUCTION_ORDERS_DATA } from "@/src/features/orders-menu/constants/orderSampleData";

export default function ProductionOrderList() {
  return (
    <DataTable
      columns={productionOrderColumns}
      data={PRODUCTION_ORDERS_DATA}
      title="Órdenes de producción"
      searchPlaceholder="Buscar por pedido o cliente..."
    />
  );
}
