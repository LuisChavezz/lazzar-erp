"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { DataTable } from "@/src/components/DataTable";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { hasPermission } from "@/src/utils/permissions";
import { isInitialLoadError } from "@/src/utils/isInitialLoadError";
import { StockTransferForm } from "./StockTransferForm";
import { getStockTransfersColumns } from "./StockTransfersColumns";
import { StockTransferDetailDialog } from "./StockTransferDetailDialog";
import { useTransferencias } from "../hooks/useTransferencias";

/**
 * Vista de Traspasos: el listado (`GET /wms/transferencias/`) más, por fila,
 * la acción "Ver Detalles" que abre `StockTransferDetailDialog`
 * (`GET /wms/transferencias/{id}/`). El id abierto vive aquí, no en la celda:
 * revertir una TR (EC-945) refresca la lista y la fila puede cambiar de página.
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

  // Registrar un traspaso exige `C-CONFIGURACION` (esta vista se alcanza desde
  // /config, cuya lectura ya exige R-CONFIGURACION). `hasPermission` ya
  // cortocircuita para el rol "admin".
  const { data: session } = useSession();
  const canCreate = hasPermission("C-CONFIGURACION", session?.user);

  // Montaje condicional: el diálogo —y con él su `useTransferenciaDetail`— no
  // existe hasta abrirlo, así que renderizar la tabla no pide ningún detalle.
  const [detailId, setDetailId] = useState<number | null>(null);
  const columns = getStockTransfersColumns({ onOpenDetail: setDetailId });

  return (
    <div className="space-y-6">
      <DataTable
        columns={columns}
        data={transferencias}
        searchPlaceholder="Buscar folio, almacén o usuario..."
        getRowId={(row) => String(row.id)}
        onRefetch={refetch}
        isRefetching={isFetching}
        emptyMessage="No hay traspasos registrados."
        actionButton={canCreate ? <StockTransferForm /> : undefined}
        isLoading={isLoading}
        isError={isInitialLoadError(isError, hasLoaded)}
        errorTitle="Error al cargar los traspasos"
        errorMessage={extractErrorMessage(error, "No se pudo cargar la información.")}
        loadingAriaLabel="Cargando traspasos"
      />
      {detailId !== null && (
        <StockTransferDetailDialog
          transferId={detailId}
          open={true}
          onOpenChange={(open) => {
            if (!open) setDetailId(null);
          }}
        />
      )}
    </div>
  );
}
