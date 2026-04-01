"use client";

import { DataTable } from "@/src/components/DataTable";
import { embroideryQuoteColumns } from "./EmbroideryQuoteColumns";
import { EMBROIDERY_ORDERS_DATA } from "@/src/features/quotes-menu/constants/quoteSampleData";

export default function EmbroideryQuoteList() {
  return (
    <DataTable
      columns={embroideryQuoteColumns}
      data={EMBROIDERY_ORDERS_DATA}
      title="Órdenes de bordado"
      searchPlaceholder="Buscar por pedido o cliente..."
    />
  );
}
