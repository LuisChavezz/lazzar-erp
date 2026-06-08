"use client";

import { useMemo } from "react";
import { DataTable } from "@/src/components/DataTable";
import { ErrorState } from "@/src/components/ErrorState";
import { getStockColumns } from "./StockColumns";
import { useStockItems } from "../hooks/useStockItems";

export const StockList = () => {
  const { data: stockItems = [], isLoading, isError, error, refetch, isFetching } = useStockItems();

  const maxStock = useMemo(
    () => stockItems.reduce((max, item) => Math.max(max, item.stock), 0),
    [stockItems],
  );

  const columns = useMemo(() => getStockColumns(maxStock || undefined), [maxStock]);

  if (isLoading) {
    return (
      <div className="p-8 flex justify-center items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600"></div>
        <span className="ml-3 text-slate-500">Cargando existencias...</span>
      </div>
    );
  }

  if (isError) {
    return (
      <ErrorState
        title="Error al cargar existencias"
        message={(error as Error).message}
      />
    );
  }

  return (
    <div className="mt-12">
      <DataTable
        columns={columns}
        data={stockItems}
        searchPlaceholder="Buscar por producto, almacén o ubicación..."
        onRefetch={async () => {
          await refetch();
        }}
        isRefetching={isFetching}
      />
    </div>
  );
};
