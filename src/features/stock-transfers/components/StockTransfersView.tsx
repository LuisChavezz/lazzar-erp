"use client";

import { DataTable } from "@/src/components/DataTable";
import { LoadingSkeleton } from "@/src/components/LoadingSkeleton";
import { ErrorState } from "@/src/components/ErrorState";
import { StockTransferForm } from "./StockTransferForm";
import { stockTransfersColumns } from "./StockTransfersColumns";
import { useTransferencias } from "../hooks/useTransferencias";

/**
 * Vista de Traspasos: el listado (`GET /wms/transferencias/`) más, por fila,
 * la acción "Ver Detalles" que abre `StockTransferDetailDialog`
 * (`GET /wms/transferencias/{id}/`, ver `StockTransfersColumns`).
 *
 * La captura (`StockTransferForm`) se renderiza SIEMPRE, fuera del árbol de
 * estados del listado: registrar un traspaso (`POST /wms/transferencias/`) es
 * independiente de leer la lista (`GET`), así que un error o una carga lenta
 * del listado no debe dejar al usuario sin forma de crear uno nuevo.
 */
export function StockTransfersView() {
  const { transferencias, isLoading, isError, error, hasLoaded, refetch, isFetching } =
    useTransferencias();

  return (
    <div className="space-y-6">
      {/* Acción principal: SIEMPRE disponible, independiente del estado del
          listado (ver comentario del componente). */}
      <div className="flex justify-end">
        <StockTransferForm />
      </div>

      {isError && !hasLoaded ? (
        <ErrorState
          title="Error al cargar los traspasos"
          message={(error as Error).message}
        />
      ) : isLoading ? (
        <div
          className="min-h-120"
          role="status"
          aria-live="polite"
          aria-label="Cargando traspasos"
        >
          <LoadingSkeleton className="h-120 rounded-2xl" />
        </div>
      ) : (
        <DataTable
          columns={stockTransfersColumns}
          data={transferencias}
          searchPlaceholder="Buscar folio, almacén o usuario..."
          getRowId={(row) => String(row.id)}
          onRefetch={refetch}
          isRefetching={isFetching}
          emptyMessage="No hay traspasos registrados."
        />
      )}
    </div>
  );
}
