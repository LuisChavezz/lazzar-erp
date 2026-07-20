"use client";

import { DataTable } from "@/src/components/DataTable";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { isInitialLoadError } from "@/src/utils/isInitialLoadError";
import { StockTransferForm } from "./StockTransferForm";
import { stockTransfersColumns } from "./StockTransfersColumns";
import { useTransferencias } from "../hooks/useTransferencias";

/**
 * Vista de Traspasos: el listado (`GET /wms/transferencias/`) más, por fila,
 * la acción "Ver Detalles" que abre `StockTransferDetailDialog`
 * (`GET /wms/transferencias/{id}/`, ver `StockTransfersColumns`).
 *
 * `DataTable` se monta SIEMPRE (no se sustituye por un skeleton/ErrorState en un
 * ternario propio): recibe `isLoading`/`isError` y alterna internamente solo su
 * ÁREA DE DATOS, dejando el toolbar —y por tanto la captura `StockTransferForm`
 * (`POST /wms/transferencias/`)— visible en su posición habitual durante la
 * carga y el error. Registrar un traspaso es independiente de leer la lista, así
 * que un `GET` lento o fallido no debe dejar al usuario sin forma de crear uno.
 */
export function StockTransfersView() {
  const { transferencias, isLoading, isError, error, hasLoaded, refetch, isFetching } =
    useTransferencias();

  return (
    <div className="space-y-6">
      <DataTable
        columns={stockTransfersColumns}
        data={transferencias}
        searchPlaceholder="Buscar folio, almacén o usuario..."
        getRowId={(row) => String(row.id)}
        onRefetch={refetch}
        isRefetching={isFetching}
        emptyMessage="No hay traspasos registrados."
        actionButton={<StockTransferForm />}
        isLoading={isLoading}
        isError={isInitialLoadError(isError, hasLoaded)}
        errorTitle="Error al cargar los traspasos"
        errorMessage={extractErrorMessage(error, "No se pudo cargar la información.")}
        loadingAriaLabel="Cargando traspasos"
      />
    </div>
  );
}
