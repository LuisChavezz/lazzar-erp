"use client";

import { DataTable } from "@/src/components/DataTable";
import { embroideryOrderColumns } from "./EmbroideryOrderColumns";
import { EMBROIDERY_ORDERS_DATA } from "@/src/features/orders-menu/constants/orderSampleData";

export default function EmbroideryOrderList() {
  return (
    <DataTable
      columns={embroideryOrderColumns}
      data={EMBROIDERY_ORDERS_DATA}
      title="Órdenes de bordado"
      searchPlaceholder="Buscar por pedido o cliente..."
    />
  );
}
