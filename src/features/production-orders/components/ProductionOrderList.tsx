"use client";

import { useMemo } from "react";
import { DataTable } from "@/src/components/DataTable";
import { getProductionOrderColumns } from "./ProductionOrderColumns";
import { type ProductionOrder } from "../interfaces/production-order.interface";

const ORDERS: ProductionOrder[] = [];

/** Lista principal de órdenes de producción */
export function ProductionOrderList() {
  const columns = useMemo(() => getProductionOrderColumns(), []);

  return (
    <div className="space-y-5">
      <DataTable
        columns={columns}
        data={ORDERS}
        baseDataCount={ORDERS.length}
        searchPlaceholder="Buscar folio, producto, área…"
      />
    </div>
  );
}
