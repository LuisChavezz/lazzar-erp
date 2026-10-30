"use client";

import { useState } from "react";
import { DataTable } from "@/src/components/DataTable";
import { Button } from "@/src/components/Button";
import { MainDialog } from "@/src/components/MainDialog";
import { DialogHeader } from "@/src/components/DialogHeader";
import { ConfirmDialog } from "@/src/components/ConfirmDialog";
import { CentrosCostoIcon } from "@/src/components/Icons";
import { withHeaderFilters } from "@/src/components/withHeaderFilters";
import { useActivoToggleDialog } from "@/src/hooks/useActivoToggleDialog";
import { DIALOG_WIDTH_FORM } from "@/src/constants/dialogWidths";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { isInitialLoadError } from "@/src/utils/isInitialLoadError";
import type { CostCenter } from "../interfaces/cost-center.interface";
import { useCostCenters } from "../hooks/useCostCenters";
import { useToggleCostCenterActivo } from "../hooks/useToggleCostCenterActivo";
import {
  CostCenterRowActionsProvider,
  usePendingCostCenterIds,
} from "../hooks/useCostCenterRowActions";
import { COST_CENTER_STALE_MESSAGES } from "../utils/costCenterStaleMessages";
import { COST_CENTER_HEADER_FILTERS, getColumns, getCostCenterLabel } from "./CostCenterColumns";
import { CostCenterDetailDialog } from "./CostCenterDetailDialog";
import CostCenterForm from "./CostCenterForm";

export default function CostCenterList() {
  // Sin parámetros: el catálogo COMPLETO, con los dados de baja incluidos. Es
  // una entrada de caché distinta de la de la póliza, que sí filtra por
  // `activo` (ver `useCostCenters`).
  const { centrosCosto, hasLoaded, isLoading, isError, error, refetch, isFetching } =
    useCostCenters();

  // Estado de TODOS los diálogos en la vista, nunca en la celda: una celda se
  // desmonta al ordenar, filtrar o paginar, y dar de baja cambia `activo`, que
  // es justo el filtro de la tabla.
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<CostCenter | null>(null);
  const [openDetailId, setOpenDetailId] = useState<number | null>(null);

  const { mutate: toggleActivo, isPending: isTogglePending } = useToggleCostCenterActivo();
  const busyIds = usePendingCostCenterIds();

  // Confirmación de activar/desactivar, resuelta contra el listado COMPLETO:
  // sobrevive a que la fila salga de la vista filtrada (ver `useActivoToggleDialog`).
  const toggle = useActivoToggleDialog({
    rows: centrosCosto,
    busyIds,
    isPending: isTogglePending,
    resource: "cost-center",
    messages: COST_CENTER_STALE_MESSAGES,
  });
  // Copia del registro al abrir: estrecha el tipo dentro de los callbacks del diálogo.
  const toggleSnapshot = toggle.snapshot;

  // Un error de refetch transitorio no debe descartar la tabla ya cargada; solo
  // se trata como error "de pantalla completa" si la consulta nunca cargó.
  const showError = isInitialLoadError(isError, hasLoaded);

  const handleEdit = (centro: CostCenter) => {
    setEditTarget(centro);
    setIsFormOpen(true);
  };

  const handleNew = () => {
    setEditTarget(null);
    setIsFormOpen(true);
  };

  // No dependen de nada: callbacks y "en vuelo" llegan al menú por
  // `CostCenterRowActionsProvider`, así una acción no remonta las celdas.
  const columns = withHeaderFilters(getColumns(), centrosCosto, COST_CENTER_HEADER_FILTERS);

  // ── Diálogos de fila, resueltos contra el listado COMPLETO ────────────────
  // Sobreviven a que la fila salga de la vista filtrada —p. ej. dar de baja con
  // el filtro "Activo" puesto— y muestran el valor nuevo tras el refetch. Sin
  // fetch propio: listado y detalle comparten serializer.
  const detailCentro =
    openDetailId !== null
      ? centrosCosto.find((centro) => centro.id === openDetailId) ?? null
      : null;

  // Si el centro desaparece del payload, el id no puede quedar colgado (un
  // refetch posterior reabriría el diálogo solo). Ajuste en RENDER, no en un
  // efecto (`react-hooks/set-state-in-effect`).
  if (openDetailId !== null && detailCentro === null) setOpenDetailId(null);

  // `DataTable` se monta SIEMPRE: recibe `isLoading`/`isError` y alterna solo su
  // cuerpo, de modo que el toolbar —búsqueda, filtros, refrescar, columnas y el
  // botón de alta— sigue disponible durante la carga y ante un error.
  return (
    <CostCenterRowActionsProvider
      value={{
        onViewDetail: (centro) => setOpenDetailId(centro.id),
        onEdit: handleEdit,
        onToggleActivo: toggle.request,
        busyIds,
      }}
    >
      <div className="h-full flex flex-col min-h-0">
        <DataTable
          columns={columns}
          data={centrosCosto}
          baseDataCount={centrosCosto.length}
          searchPlaceholder="Buscar por código, nombre o descripción..."
          fillHeight
          onRefetch={refetch}
          isRefetching={isFetching}
          emptyMessage="No hay centros de costo registrados."
          isLoading={isLoading}
          isError={showError}
          errorTitle="Error al cargar los centros de costo"
          errorMessage={extractErrorMessage(error, "No se pudo cargar la información.")}
          onErrorRetry={refetch}
          loadingAriaLabel="Cargando los centros de costo"
          // Ata la identidad de la fila al id del registro y no a su índice:
          // dar de baja cambia `activo`, que es un filtro.
          getRowId={(row) => String(row.id)}
          // Un alta vuelve a la página 1 sin perder orden, búsqueda ni columnas.
          paginationResetKey={centrosCosto.length}
          actionButton={
            <MainDialog
              title={
                <DialogHeader
                  title={
                    editTarget ? "Editar Centro de Costo" : "Alta de Centro de Costo"
                  }
                  subtitle={
                    editTarget
                      ? "Edición de registro del catálogo"
                      : "Registro nuevo en el catálogo"
                  }
                  statusColor="indigo"
                  icon={CentrosCostoIcon}
                />
              }
              open={isFormOpen}
              onOpenChange={setIsFormOpen}
              maxWidth={DIALOG_WIDTH_FORM}
              trigger={
                <Button
                  variant="primary"
                  rounded="full"
                  onClick={handleNew}
                  className="hover:scale-105 active:scale-95"
                >
                  + Nuevo Centro
                </Button>
              }
            >
              {isFormOpen && (
                // `key`: cambiar de registro REMONTA el formulario, así que sus
                // valores iniciales se leen de cero sin un `form.reset` en efecto.
                <CostCenterForm
                  key={editTarget ? `edit-${editTarget.id}` : "new"}
                  centroToEdit={editTarget}
                  onSuccess={() => setIsFormOpen(false)}
                />
              )}
            </MainDialog>
          }
        />

        {detailCentro && (
          <CostCenterDetailDialog
            centro={detailCentro}
            open={true}
            onOpenChange={(open) => {
              if (!open) setOpenDetailId(null);
            }}
          />
        )}

        {/*
          Montado mientras haya una copia: `open` sale del objetivo, así que al
          cerrarse anima su salida con el texto de la apertura.
        */}
        {toggleSnapshot && (
          <ConfirmDialog
            key={toggle.sessionId}
            open={toggle.open}
            onOpenChange={(open) => {
              if (!open) toggle.close();
            }}
            title={
              toggleSnapshot.activo
                ? "Dar de Baja Centro de Costo"
                : "Reactivar Centro de Costo"
            }
            description={
              toggleSnapshot.activo
                ? `¿Deseas dar de baja el centro de costo ${getCostCenterLabel(toggleSnapshot)}? Su información se conserva y seguirá visible en el listado con estatus Inactivo, pero dejará de ofrecerse al capturar una póliza.`
                : // El código solo es único entre los ACTIVOS: mientras estuvo de
                  // baja otro pudo tomarlo, y entonces el backend rechaza la
                  // reactivación. Se avisa aquí y el motivo exacto llega en el
                  // toast de error (ver `useToggleCostCenterActivo`).
                  `¿Deseas reactivar el centro de costo ${getCostCenterLabel(toggleSnapshot)}? Volverá a ofrecerse al capturar una póliza. Si otro centro activo ya usa su código, habrá que cambiarlo antes.`
            }
            confirmText={
              toggleSnapshot.activo
                ? toggle.isBusy
                  ? "Dando de baja..."
                  : "Dar de baja"
                : toggle.isBusy
                  ? "Reactivando..."
                  : "Reactivar"
            }
            cancelText="Volver"
            closeOnConfirm={false}
            busy={toggle.isBusy}
            onConfirm={() => {
              toggleActivo(
                { id: toggleSnapshot.id, activo: !toggleSnapshot.activo },
                { onSettled: () => toggle.close() },
              );
            }}
            // `ConfirmDialog` usa la paleta de Radix: "green", no "emerald".
            confirmColor={toggleSnapshot.activo ? "amber" : "green"}
          />
        )}
      </div>
    </CostCenterRowActionsProvider>
  );
}
