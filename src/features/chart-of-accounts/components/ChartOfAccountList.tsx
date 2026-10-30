"use client";

import { useState } from "react";
import { DataTable } from "@/src/components/DataTable";
import { Button } from "@/src/components/Button";
import { MainDialog } from "@/src/components/MainDialog";
import { DialogHeader } from "@/src/components/DialogHeader";
import { ConfirmDialog } from "@/src/components/ConfirmDialog";
import { PlanCuentasIcon } from "@/src/components/Icons";
import { withHeaderFilters } from "@/src/components/withHeaderFilters";
import { useActivoToggleDialog } from "@/src/hooks/useActivoToggleDialog";
import { DIALOG_WIDTH_FORM } from "@/src/constants/dialogWidths";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { isInitialLoadError } from "@/src/utils/isInitialLoadError";
import type { CuentaContable } from "../interfaces/chart-of-account.interface";
import { useChartOfAccounts } from "../hooks/useChartOfAccounts";
import { useToggleChartOfAccountActivo } from "../hooks/useToggleChartOfAccountActivo";
import {
  ChartOfAccountRowActionsProvider,
  usePendingChartOfAccountIds,
} from "../hooks/useChartOfAccountRowActions";
import { CHART_OF_ACCOUNT_STALE_MESSAGES } from "../utils/chartOfAccountStaleMessages";
import {
  CHART_OF_ACCOUNT_HEADER_FILTERS,
  getChartOfAccountLabel,
  getColumns,
} from "./ChartOfAccountColumns";
import { ChartOfAccountDetailDialog } from "./ChartOfAccountDetailDialog";
import ChartOfAccountForm from "./ChartOfAccountForm";

export default function ChartOfAccountList() {
  const { cuentasContables, hasLoaded, isLoading, isError, error, refetch, isFetching } =
    useChartOfAccounts();

  // Estado de TODOS los diálogos en la vista, nunca en la celda: una celda se
  // desmonta al ordenar, filtrar o paginar, y activar/desactivar cambia `activo`,
  // que es justo uno de los filtros de la tabla.
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<CuentaContable | null>(null);
  const [openDetailId, setOpenDetailId] = useState<number | null>(null);

  const { mutate: toggleActivo, isPending: isTogglePending } =
    useToggleChartOfAccountActivo();
  const busyIds = usePendingChartOfAccountIds();

  // Confirmación de activar/desactivar, resuelta contra el listado COMPLETO:
  // sobrevive a que la fila salga de la vista filtrada (ver `useActivoToggleDialog`).
  const toggle = useActivoToggleDialog({
    rows: cuentasContables,
    busyIds,
    isPending: isTogglePending,
    resource: "chart-of-account",
    messages: CHART_OF_ACCOUNT_STALE_MESSAGES,
  });
  // Copia del registro al abrir: estrecha el tipo dentro de los callbacks del diálogo.
  const toggleSnapshot = toggle.snapshot;

  // Un error de refetch transitorio no debe descartar la tabla ya cargada; solo
  // se trata como error "de pantalla completa" si la consulta nunca cargó.
  const showError = isInitialLoadError(isError, hasLoaded);

  const handleEdit = (cuenta: CuentaContable) => {
    setEditTarget(cuenta);
    setIsFormOpen(true);
  };

  const handleNew = () => {
    setEditTarget(null);
    setIsFormOpen(true);
  };

  // No dependen de nada: callbacks y "en vuelo" llegan al menú por
  // `ChartOfAccountRowActionsProvider`, así una acción no remonta las celdas.
  const columns = withHeaderFilters(
    getColumns(),
    cuentasContables,
    CHART_OF_ACCOUNT_HEADER_FILTERS,
  );

  // ── Diálogos de fila, resueltos contra el listado COMPLETO ────────────────
  // Sobreviven a que la fila salga de la vista filtrada —p. ej. desactivar con
  // el filtro "Activo" puesto— y muestran el valor nuevo tras el refetch. Sin
  // fetch propio: listado y detalle comparten serializer.
  const detailCuenta =
    openDetailId !== null
      ? cuentasContables.find((cuenta) => cuenta.id === openDetailId) ?? null
      : null;

  // Si la cuenta desaparece del payload, el id no puede quedar colgado (un
  // refetch posterior reabriría el diálogo solo). Ajuste en RENDER, no en un
  // efecto (`react-hooks/set-state-in-effect`).
  if (openDetailId !== null && detailCuenta === null) setOpenDetailId(null);

  // `DataTable` se monta SIEMPRE: recibe `isLoading`/`isError` y alterna solo su
  // cuerpo, de modo que el toolbar —búsqueda, filtros, refrescar, columnas y el
  // botón de alta— sigue disponible durante la carga y ante un error.
  return (
    <ChartOfAccountRowActionsProvider
      value={{
        onViewDetail: (cuenta) => setOpenDetailId(cuenta.id),
        onEdit: handleEdit,
        onToggleActivo: toggle.request,
        busyIds,
      }}
    >
      <div className="h-full flex flex-col min-h-0">
        <DataTable
          columns={columns}
          data={cuentasContables}
          baseDataCount={cuentasContables.length}
          searchPlaceholder="Buscar por código o nombre de cuenta..."
          fillHeight
          onRefetch={refetch}
          isRefetching={isFetching}
          emptyMessage="No hay cuentas contables registradas."
          isLoading={isLoading}
          isError={showError}
          errorTitle="Error al cargar el plan de cuentas"
          errorMessage={extractErrorMessage(error, "No se pudo cargar la información.")}
          onErrorRetry={refetch}
          loadingAriaLabel="Cargando el plan de cuentas"
          // Ata la identidad de la fila al id del registro y no a su índice:
          // activar/desactivar cambia `activo`, que es un filtro.
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
                  icon={PlanCuentasIcon}
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
              toggleSnapshot.activo ? "Desactivar Cuenta Contable" : "Activar Cuenta Contable"
            }
            description={
              toggleSnapshot.activo
                ? `¿Deseas desactivar la cuenta ${getChartOfAccountLabel(toggleSnapshot)}? Su información se conserva y seguirá visible en el listado con estatus Inactivo, pero dejará de ofrecerse al capturar una póliza.`
                : `¿Deseas activar la cuenta ${getChartOfAccountLabel(toggleSnapshot)}? Volverá a estar disponible para su uso.`
            }
            confirmText={
              toggleSnapshot.activo
                ? toggle.isBusy
                  ? "Desactivando..."
                  : "Desactivar"
                : toggle.isBusy
                  ? "Activando..."
                  : "Activar"
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
    </ChartOfAccountRowActionsProvider>
  );
}
