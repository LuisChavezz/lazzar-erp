"use client";

import { useMemo, useState } from "react";
import { DataTable } from "@/src/components/DataTable";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { getStockColumns } from "./StockColumns";
import { SkuInfoDialog } from "./SkuInfoDialog";
import { useStockItems } from "../hooks/useStockItems";

export const StockList = () => {
  const { data: stockItems = [], isLoading, isError, error, refetch, isFetching } = useStockItems();

  // ── Diálogo de información del SKU (renderizado fuera de la tabla; ver
  // `SkuColumnHeader` en StockColumns.tsx para el motivo) ──────────────────
  const [skuInfoOpen, setSkuInfoOpen] = useState(false);

  const maxStock = useMemo(
    () => stockItems.reduce((max, item) => Math.max(max, item.stock), 0),
    [stockItems],
  );

  const columns = useMemo(
    () => getStockColumns(maxStock || undefined, () => setSkuInfoOpen(true)),
    [maxStock],
  );

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
        isLoading={isLoading}
        isError={isError}
        errorTitle="Error al cargar existencias"
        errorMessage={extractErrorMessage(error, "No se pudo cargar la información.")}
        loadingAriaLabel="Cargando existencias"
      />

      <SkuInfoDialog open={skuInfoOpen} onOpenChange={setSkuInfoOpen} />
    </div>
  );
};
