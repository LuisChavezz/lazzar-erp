"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { DataTable } from "@/src/components/DataTable";
import { ListExportButtons } from "@/src/components/ListExportButtons";
import { useListExport } from "@/src/hooks/useListExport";
import { useCompanyBranches } from "@/src/features/branches/hooks/useCompanyBranches";
import { useSessionCompanyId } from "@/src/features/workspace/hooks/useSessionCompany";
import type { SurtidoPedido } from "../interfaces/order-fulfillment.interface";
import { SURTIDO_PEDIDOS_KEY } from "../constants/surtidoPedidosTable";
import { useSurtidoPedidosTable } from "../hooks/useSurtidoPedidosTable";
import { SurtidoPedidoRowActionsProvider } from "../hooks/useSurtidoPedidoRowActions";
import { surtidoPedidoColumns } from "./SurtidoPedidoColumns";
import { SurtidoPedidoDetailDialog } from "./SurtidoPedidoDetailDialog";
import { SurtidoPedidosFilters } from "./SurtidoPedidosFilters";
import { SURTIDO_PEDIDO_EXPORT_COLUMNS } from "../utils/surtidoPedidoExport";

/**
 * Avance de surtido por pedido (EC-913), solo lectura y en MODO SERVIDOR:
 * filtros, búsqueda y paginación los resuelve el backend y su estado vive en
 * la URL (`useSurtidoPedidosTable`). Por eso la página lo envuelve en
 * `<Suspense>`.
 */
export const SurtidoPedidosList = () => {
  const table = useSurtidoPedidosTable();
  const queryClient = useQueryClient();
  const { branches, isLoading: isBranchesLoading } = useCompanyBranches(
    useSessionCompanyId(),
  );

  // El diálogo vive AQUÍ y no en la celda: la celda se desmonta al refrescar,
  // paginar o filtrar. `open` va aparte para que el contenido no se vacíe
  // durante la animación de cierre.
  const [detailPedido, setDetailPedido] = useState<SurtidoPedido | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Excel/PDF: TODO lo que cumple los filtros vigentes (no solo la página).
  const { exportCsv, exportPdf } = useListExport({
    getRows: table.fetchAllRows,
    columns: SURTIDO_PEDIDO_EXPORT_COLUMNS,
    title: "Avance de surtido",
    fileName: "avance-surtido",
    summary: (rows) => `${rows.length} pedido${rows.length === 1 ? "" : "s"}`,
  });

  return (
    <SurtidoPedidoRowActionsProvider
      value={{
        onViewDetail: (pedido) => {
          setDetailPedido(pedido);
          setIsDetailOpen(true);
        },
      }}
    >
      <div className="space-y-4">
        <SurtidoPedidosFilters
          filters={table.state.filters}
          setFilter={table.setFilter}
          branches={branches}
          isBranchesLoading={isBranchesLoading}
          hasActiveFilters={table.hasActiveCriteria}
          onClearFilters={table.clear}
        />

        {/* Alto FIJO, como el resto de WMS: la página hace scroll. */}
        <div className="h-[44rem] flex flex-col">
          <DataTable
            columns={surtidoPedidoColumns}
            fillHeight
            {...table.tableProps}
            // Invalida el PREFIJO: refresca también el detalle abierto.
            onRefetch={() =>
              queryClient.invalidateQueries({ queryKey: SURTIDO_PEDIDOS_KEY })
            }
            getRowId={(row) => String(row.id)}
            searchPlaceholder="Buscar por folio o cliente..."
            // Solo se lee en la vista por defecto: con filtros o búsqueda activos
            // el modo servidor de DataTable pone su propio texto ("No hay
            // resultados con los filtros aplicados") y su "Limpiar filtros".
            emptyMessage="No hay pedidos autorizados ni en proceso"
            errorTitle="Error al cargar el avance de surtido"
            loadingAriaLabel="Cargando avance de surtido"
            actionButton={
              <div className="flex items-center gap-2 shrink-0">
                <ListExportButtons
                  subject="avance de surtido"
                  onExcel={() => void exportCsv()}
                  onPdf={() => void exportPdf()}
                />
              </div>
            }
          />
        </div>
      </div>

      <SurtidoPedidoDetailDialog
        pedido={detailPedido}
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
      />
    </SurtidoPedidoRowActionsProvider>
  );
};
