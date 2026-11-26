"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { DataTable } from "@/src/components/DataTable";
import { useCompanyBranches } from "@/src/features/branches/hooks/useCompanyBranches";
import { useSessionCompanyId } from "@/src/features/workspace/hooks/useSessionCompany";
import type { PedidoDetailOrigin } from "@/src/features/orders/constants/pedidoDetailOrigins";
import type { StockDigitalFila } from "../interfaces/digital-stock.interface";
import { DIGITAL_STOCK_KEY } from "../constants/digitalStockTable";
import { useDigitalStockTable } from "../hooks/useDigitalStockTable";
import { DigitalStockRowActionsProvider } from "../hooks/useDigitalStockRowActions";
import { digitalStockColumns } from "./DigitalStockColumns";
import { DigitalStockDetailDialog } from "./DigitalStockDetailDialog";
import { DigitalStockFilters } from "./DigitalStockFilters";

interface DigitalStockListProps {
  /**
   * Origen con que los folios de pedido del detalle abren `/orders/[id]`: cada
   * módulo (Ventas, Mesa de Control) vuelve a SU pantalla de stock digital.
   */
  pedidoOrigin: Extract<PedidoDetailOrigin, "sales-digital-stock" | "operations-digital-stock">;
}

/**
 * Stock digital por SKU (EC-977), solo lectura y en MODO SERVIDOR: filtros,
 * búsqueda y paginación los resuelve el backend y su estado vive en la URL
 * (`useDigitalStockTable`). Por eso la página lo envuelve en `<Suspense>`. La
 * misma pantalla se monta en Ventas y en Mesa de Control.
 */
export const DigitalStockList = ({ pedidoOrigin }: DigitalStockListProps) => {
  const table = useDigitalStockTable();
  const queryClient = useQueryClient();
  const { branches, isLoading: isBranchesLoading } = useCompanyBranches(useSessionCompanyId());

  // El diálogo vive AQUÍ y no en la celda: la celda se desmonta al refrescar,
  // paginar o filtrar. `open` va aparte para que el contenido no se vacíe
  // durante la animación de cierre.
  const [detailFila, setDetailFila] = useState<StockDigitalFila | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  return (
    <DigitalStockRowActionsProvider
      value={{
        onViewDetail: (fila) => {
          setDetailFila(fila);
          setIsDetailOpen(true);
        },
      }}
    >
      <div className="space-y-4">
        <DigitalStockFilters
          filters={table.state.filters}
          setFilter={table.setFilter}
          branches={branches}
          isBranchesLoading={isBranchesLoading}
          hasActiveFilters={table.hasActiveCriteria}
          onClearFilters={table.clear}
        />

        <div className="h-[44rem] flex flex-col">
          <DataTable
            columns={digitalStockColumns}
            fillHeight
            {...table.tableProps}
            // Invalida el PREFIJO: refresca también el detalle abierto.
            onRefetch={() => queryClient.invalidateQueries({ queryKey: DIGITAL_STOCK_KEY })}
            getRowId={(row) => String(row.variante_id)}
            searchPlaceholder="Buscar por SKU o producto..."
            emptyMessage="No hay SKUs de producto terminado"
            errorTitle="Error al cargar el stock digital"
            loadingAriaLabel="Cargando stock digital"
          />
        </div>
      </div>

      <DigitalStockDetailDialog
        fila={detailFila}
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        pedidoOrigin={pedidoOrigin}
      />
    </DigitalStockRowActionsProvider>
  );
};
