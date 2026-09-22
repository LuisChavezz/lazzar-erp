"use client";

import { useState } from "react";
import { DataTable } from "@/src/components/DataTable";
import { Button } from "@/src/components/Button";
import { MainDialog } from "@/src/components/MainDialog";
import { DialogHeader } from "@/src/components/DialogHeader";
import { ConfirmDialog } from "@/src/components/ConfirmDialog";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { isInitialLoadError } from "@/src/utils/isInitialLoadError";
import { CUENTA_CONTABLE_TIPO_FILTER } from "../constants/chartOfAccountTipo";
import type { CuentaContable } from "../interfaces/chart-of-account.interface";
import { useChartOfAccounts } from "../hooks/useChartOfAccounts";
import { useToggleChartOfAccountActivo } from "../hooks/useToggleChartOfAccountActivo";
import { getColumns } from "./ChartOfAccountColumns";
import { ChartOfAccountDetailDialog } from "./ChartOfAccountDetailDialog";
import ChartOfAccountForm from "./ChartOfAccountForm";

/**
 * Filtros de la tabla. `DataTable` filtra en MEMORIA comparando
 * `String(row[configId]) === value`, así que los booleanos van como "true"/"false"
 * y el tipo con los valores CRUDOS del enum. El backend acepta `?activo=`,
 * `?tipo=` y `?acepta_movimientos=`, pero la tabla no tiene puente hacia
 * parámetros del servidor.
 */
const ACTIVO_FILTER = [
  { value: "true", label: "Activo" },
  { value: "false", label: "Inactivo" },
];

const ACEPTA_MOVIMIENTOS_FILTER = [
  { value: "true", label: "Acepta movimientos" },
  { value: "false", label: "Agrupación" },
];

export default function ChartOfAccountList() {
  const { cuentasContables, hasLoaded, isLoading, isError, error, refetch, isFetching } =
    useChartOfAccounts();

  // Estado de TODOS los diálogos en la vista, nunca en la celda: una celda se
  // desmonta al ordenar, filtrar o paginar, y activar/desactivar cambia `activo`,
  // que es justo uno de los filtros de la tabla.
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<CuentaContable | null>(null);
  const [openDetailId, setOpenDetailId] = useState<number | null>(null);
  const [toggleTargetId, setToggleTargetId] = useState<number | null>(null);

  const { mutate: toggleActivo, isPending: isToggling } =
    useToggleChartOfAccountActivo();

  // Un error de refetch transitorio no debe descartar la tabla ya cargada; solo
  // se trata como error "de pantalla completa" si la consulta nunca cargó.
  const showError = isInitialLoadError(isError, hasLoaded);

  // Sin `useCallback`/`useMemo`: el React Compiler memoiza el componente y
  // `DataTable` no depende de la identidad de `columns`.
  const handleViewDetail = (cuenta: CuentaContable) => setOpenDetailId(cuenta.id);

  const handleEdit = (cuenta: CuentaContable) => {
    setEditTarget(cuenta);
    setIsFormOpen(true);
  };

  const handleNew = () => {
    setEditTarget(null);
    setIsFormOpen(true);
  };

  const handleToggleActivo = (cuenta: CuentaContable) => setToggleTargetId(cuenta.id);

  const columns = getColumns(handleViewDetail, handleEdit, handleToggleActivo);

  // El detalle y la confirmación se resuelven contra el arreglo COMPLETO, así que
  // sobreviven a que la fila salga de la vista filtrada —p. ej. desactivar con el
  // filtro "Activo" puesto— y muestran el valor nuevo tras el refetch. Sin fetch
  // propio: listado y detalle comparten serializer.
  const detailCuenta =
    openDetailId !== null
      ? cuentasContables.find((cuenta) => cuenta.id === openDetailId) ?? null
      : null;
  const toggleCuenta =
    toggleTargetId !== null
      ? cuentasContables.find((cuenta) => cuenta.id === toggleTargetId) ?? null
      : null;

  // Si la cuenta desaparece del payload, el id no puede quedar colgado (un
  // refetch posterior reabriría el diálogo solo). Ajuste en RENDER, no en un
  // efecto (`react-hooks/set-state-in-effect`).
  if (openDetailId !== null && detailCuenta === null) setOpenDetailId(null);
  if (toggleTargetId !== null && toggleCuenta === null) setToggleTargetId(null);

  // `DataTable` se monta SIEMPRE: recibe `isLoading`/`isError` y alterna solo su
  // cuerpo, de modo que el toolbar —búsqueda, filtros, refrescar, columnas y el
  // botón de alta— sigue disponible durante la carga y ante un error.
  return (
    <>
      <DataTable
        columns={columns}
        data={cuentasContables}
        baseDataCount={cuentasContables.length}
        searchPlaceholder="Buscar por código o nombre de cuenta..."
        filterConfig={[
          { id: "tipo", label: "Tipo", options: CUENTA_CONTABLE_TIPO_FILTER },
          {
            id: "acepta_movimientos",
            label: "Movimientos",
            options: ACEPTA_MOVIMIENTOS_FILTER,
          },
          { id: "activo", label: "Estatus", options: ACTIVO_FILTER },
        ]}
        onRefetch={refetch}
        isRefetching={isFetching}
        emptyMessage="No hay cuentas contables registradas."
        isLoading={isLoading}
        isError={showError}
        errorTitle="Error al cargar el plan de cuentas"
        errorMessage={extractErrorMessage(error, "No se pudo cargar la información.")}
        onErrorRetry={refetch}
        loadingAriaLabel="Cargando el plan de cuentas"
        getRowId={(row) => String(row.id)}
        // Un alta vuelve a la página 1 sin perder orden, búsqueda ni columnas.
        paginationResetKey={cuentasContables.length}
        actionButton={
          <MainDialog
            title={
              <DialogHeader
                title={editTarget ? "Editar Cuenta Contable" : "Alta de Cuenta Contable"}
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
                + Nueva Cuenta
              </Button>
            }
          >
            {isFormOpen && (
              // `key`: cambiar de registro REMONTA el formulario, así que sus
              // valores iniciales se leen de cero sin un `form.reset` en efecto.
              <ChartOfAccountForm
                key={editTarget ? `edit-${editTarget.id}` : "new"}
                cuentaToEdit={editTarget}
                onSuccess={() => setIsFormOpen(false)}
              />
            )}
          </MainDialog>
        }
      />

      {detailCuenta && (
        <ChartOfAccountDetailDialog
          cuenta={detailCuenta}
          open={true}
          onOpenChange={(open) => {
            if (!open) setOpenDetailId(null);
          }}
        />
      )}

      {toggleCuenta && (
        <ConfirmDialog
          open={true}
          onOpenChange={(open) => {
            if (!open) setToggleTargetId(null);
          }}
          title={
            toggleCuenta.activo ? "Desactivar Cuenta Contable" : "Activar Cuenta Contable"
          }
          description={
            toggleCuenta.activo
              ? `¿Deseas desactivar la cuenta ${toggleCuenta.codigo || `#${toggleCuenta.id}`}? Su información se conserva y seguirá visible en el listado con estatus Inactivo, pero dejará de ofrecerse al capturar una póliza.`
              : `¿Deseas activar la cuenta ${toggleCuenta.codigo || `#${toggleCuenta.id}`}? Volverá a estar disponible para su uso.`
          }
          confirmText={
            isToggling
              ? toggleCuenta.activo
                ? "Desactivando..."
                : "Activando..."
              : toggleCuenta.activo
                ? "Desactivar"
                : "Activar"
          }
          cancelText="Volver"
          onConfirm={() => {
            toggleActivo({ id: toggleCuenta.id, activo: !toggleCuenta.activo });
            setToggleTargetId(null);
          }}
          // `ConfirmDialog` usa la paleta de Radix: "green", no "emerald".
          confirmColor={toggleCuenta.activo ? "amber" : "green"}
        />
      )}
    </>
  );
}
