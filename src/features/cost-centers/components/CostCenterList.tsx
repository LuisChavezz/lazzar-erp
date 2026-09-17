"use client";

import { useState } from "react";
import { DataTable } from "@/src/components/DataTable";
import { Button } from "@/src/components/Button";
import { MainDialog } from "@/src/components/MainDialog";
import { DialogHeader } from "@/src/components/DialogHeader";
import { ConfirmDialog } from "@/src/components/ConfirmDialog";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { isInitialLoadError } from "@/src/utils/isInitialLoadError";
import type { CostCenter } from "../interfaces/cost-center.interface";
import { useCostCenters } from "../hooks/useCostCenters";
import { useToggleCostCenterActivo } from "../hooks/useToggleCostCenterActivo";
import { getColumns } from "./CostCenterColumns";
import { CostCenterDetailDialog } from "./CostCenterDetailDialog";
import CostCenterForm from "./CostCenterForm";

/**
 * Filtro de la tabla. `DataTable` filtra en MEMORIA comparando
 * `String(row[configId]) === value`, así que el booleano va como "true"/"false".
 * El backend acepta `?activo=`, pero la tabla no tiene puente hacia parámetros
 * del servidor —y además ese parámetro no sabe decir "todos": con cualquier
 * valor no verdadero devuelve solo los inactivos (ver `CostCenterQueryParams`)—.
 *
 * Es el único filtro del catálogo: el modelo no tiene `tipo` ni ningún otro
 * enum, a diferencia del plan de cuentas.
 */
const ACTIVO_FILTER = [
  { value: "true", label: "Activo" },
  { value: "false", label: "Inactivo" },
];

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
  const [toggleTargetId, setToggleTargetId] = useState<number | null>(null);

  // Sin `isPending`: `ConfirmDialog` cierra al confirmar (su `closeOnConfirm`
  // por defecto) y `onConfirm` además suelta el id, así que una etiqueta de
  // pendiente en el botón no alcanzaría a pintarse. El aviso de que algo pasó lo
  // da la fila, que cambia de estatus al instante por el optimista.
  const { mutate: toggleActivo } = useToggleCostCenterActivo();

  // Un error de refetch transitorio no debe descartar la tabla ya cargada; solo
  // se trata como error "de pantalla completa" si la consulta nunca cargó.
  const showError = isInitialLoadError(isError, hasLoaded);

  // Sin `useCallback`/`useMemo`: el React Compiler memoiza el componente y
  // `DataTable` no depende de la identidad de `columns`.
  const handleViewDetail = (centro: CostCenter) => setOpenDetailId(centro.id);

  const handleEdit = (centro: CostCenter) => {
    setEditTarget(centro);
    setIsFormOpen(true);
  };

  const handleNew = () => {
    setEditTarget(null);
    setIsFormOpen(true);
  };

  const handleToggleActivo = (centro: CostCenter) => setToggleTargetId(centro.id);

  const columns = getColumns(handleViewDetail, handleEdit, handleToggleActivo);

  // El detalle y la confirmación se resuelven contra el arreglo COMPLETO, así que
  // sobreviven a que la fila salga de la vista filtrada —p. ej. dar de baja con
  // el filtro "Activo" puesto— y muestran el valor nuevo tras el refetch. Sin
  // fetch propio: listado y detalle comparten serializer.
  const detailCentro =
    openDetailId !== null
      ? centrosCosto.find((centro) => centro.id === openDetailId) ?? null
      : null;
  const toggleCentro =
    toggleTargetId !== null
      ? centrosCosto.find((centro) => centro.id === toggleTargetId) ?? null
      : null;

  // Si el centro desaparece del payload, el id no puede quedar colgado (un
  // refetch posterior reabriría el diálogo solo). Ajuste en RENDER, no en un
  // efecto (`react-hooks/set-state-in-effect`).
  if (openDetailId !== null && detailCentro === null) setOpenDetailId(null);
  if (toggleTargetId !== null && toggleCentro === null) setToggleTargetId(null);

  // `DataTable` se monta SIEMPRE: recibe `isLoading`/`isError` y alterna solo su
  // cuerpo, de modo que el toolbar —búsqueda, filtros, refrescar, columnas y el
  // botón de alta— sigue disponible durante la carga y ante un error.
  return (
    <>
      <DataTable
        columns={columns}
        data={centrosCosto}
        baseDataCount={centrosCosto.length}
        title="Centros de Costo"
        searchPlaceholder="Buscar por código, nombre o descripción..."
        filterConfig={[
          { id: "activo", label: "Estatus", options: ACTIVO_FILTER },
        ]}
        onRefetch={refetch}
        isRefetching={isFetching}
        emptyMessage="No hay centros de costo registrados."
        isLoading={isLoading}
        isError={showError}
        errorTitle="Error al cargar los centros de costo"
        errorMessage={extractErrorMessage(error, "No se pudo cargar la información.")}
        onErrorRetry={refetch}
        loadingAriaLabel="Cargando los centros de costo"
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
              />
            }
            open={isFormOpen}
            onOpenChange={setIsFormOpen}
            maxWidth="900px"
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

      {toggleCentro && (
        <ConfirmDialog
          open={true}
          onOpenChange={(open) => {
            if (!open) setToggleTargetId(null);
          }}
          title={
            toggleCentro.activo
              ? "Dar de Baja Centro de Costo"
              : "Reactivar Centro de Costo"
          }
          description={
            toggleCentro.activo
              ? `¿Deseas dar de baja el centro de costo ${toggleCentro.codigo || `#${toggleCentro.id}`}? Su información se conserva y seguirá visible en el listado con estatus Inactivo, pero dejará de ofrecerse al capturar una póliza.`
              : // El código solo es único entre los ACTIVOS: mientras estuvo de
                // baja otro pudo tomarlo, y entonces el backend rechaza la
                // reactivación. Se avisa aquí y el motivo exacto llega en el
                // toast de error (ver `useToggleCostCenterActivo`).
                `¿Deseas reactivar el centro de costo ${toggleCentro.codigo || `#${toggleCentro.id}`}? Volverá a ofrecerse al capturar una póliza. Si otro centro activo ya usa su código, habrá que cambiarlo antes.`
          }
          confirmText={toggleCentro.activo ? "Dar de baja" : "Reactivar"}
          cancelText="Volver"
          onConfirm={() => {
            toggleActivo({ id: toggleCentro.id, activo: !toggleCentro.activo });
            setToggleTargetId(null);
          }}
          // `ConfirmDialog` usa la paleta de Radix: "green", no "emerald".
          confirmColor={toggleCentro.activo ? "amber" : "green"}
        />
      )}
    </>
  );
}
