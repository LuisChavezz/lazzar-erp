"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { DataTable } from "@/src/components/DataTable";
import { useCompanyBranches } from "@/src/features/branches/hooks/useCompanyBranches";
import { useSessionCompanyId } from "@/src/features/workspace/hooks/useSessionCompany";
import type { SurtidoPedido } from "../interfaces/order-fulfillment.interface";
import { SURTIDO_PEDIDOS_KEY } from "../constants/surtidoPedidosTable";
import { useSurtidoPedidosTable } from "../hooks/useSurtidoPedidosTable";
import { SurtidoPedidoRowActionsProvider } from "../hooks/useSurtidoPedidoRowActions";
import { surtidoPedidoColumns } from "./SurtidoPedidoColumns";
import { SurtidoPedidoDetailDialog } from "./SurtidoPedidoDetailDialog";
import { SurtidoPedidosFilters } from "./SurtidoPedidosFilters";

/**
 * Avance de surtido por pedido (EC-913), solo lectura y en MODO SERVIDOR:
 * filtros, búsqueda y paginación los resuelve el backend y su estado vive en
 * la URL (`useSurtidoPedidosTable`). Por eso la página lo envuelve en
 * `<Suspense>`.
 */
export const SurtidoPedidosList = () => {
  const table = useSurtidoPedidosTable();
  const queryClient = useQueryClient();
  const { branches, isLoading: isBranchesLoading } = useCompanyBranches(useSessionCompanyId());

  // El diálogo vive AQUÍ y no en la celda: la celda se desmonta al refrescar,
  // paginar o filtrar. `open` va aparte para que el contenido no se vacíe
  // durante la animación de cierre.
  const [detailPedido, setDetailPedido] = useState<SurtidoPedido | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

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
        />

        <DataTable
          columns={surtidoPedidoColumns}
          {...table.tableProps}
          // Invalida el PREFIJO: refresca también el detalle abierto.
          onRefetch={() => queryClient.invalidateQueries({ queryKey: SURTIDO_PEDIDOS_KEY })}
          getRowId={(row) => String(row.id)}
          searchPlaceholder="Buscar por folio o cliente..."
          emptyMessage="No hay pedidos con estos filtros"
          errorTitle="Error al cargar el avance de surtido"
          loadingAriaLabel="Cargando avance de surtido"
        />
      </div>

      <SurtidoPedidoDetailDialog
        pedido={detailPedido}
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
      />
    </SurtidoPedidoRowActionsProvider>
  );
};
