"use client";

import { useState } from "react";
import { DataTable } from "@/src/components/DataTable";
import { Button } from "@/src/components/Button";
import { MainDialog } from "@/src/components/MainDialog";
import { ConfirmDialog } from "@/src/components/ConfirmDialog";
import { DialogHeader } from "@/src/components/DialogHeader";
import { BancosIcon } from "@/src/components/Icons";
import { withHeaderFilters } from "@/src/components/withHeaderFilters";
import { useActivoToggleDialog } from "@/src/hooks/useActivoToggleDialog";
import { DIALOG_WIDTH_FORM } from "@/src/constants/dialogWidths";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { isInitialLoadError } from "@/src/utils/isInitialLoadError";
import { BANK_HEADER_FILTERS, getBankLabel, getColumns } from "./BankColumns";
import { Banco } from "../interfaces/bank.interface";
import BankForm from "./BankForm";
import { useBanks } from "../hooks/useBanks";
import { useToggleBankActivo } from "../hooks/useToggleBankActivo";
import { BankRowActionsProvider, usePendingBankIds } from "../hooks/useBankRowActions";
import { BANK_STALE_MESSAGES } from "../utils/bankStaleMessages";

export default function BankList() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedBank, setSelectedBank] = useState<Banco | null>(null);
  const { banks, hasLoaded, isLoading, isError, error, refetch, isFetching } = useBanks();
  const { mutate: toggleActivo, isPending: isTogglePending } = useToggleBankActivo();
  const busyIds = usePendingBankIds();

  // Confirmación de activar/desactivar, resuelta contra el listado COMPLETO:
  // sobrevive a que la fila salga de la vista filtrada (ver `useActivoToggleDialog`).
  const toggle = useActivoToggleDialog({
    rows: banks,
    busyIds,
    isPending: isTogglePending,
    resource: "bank",
    messages: BANK_STALE_MESSAGES,
  });
  // Copia del registro al abrir: estrecha el tipo dentro de los callbacks del diálogo.
  const toggleSnapshot = toggle.snapshot;

  // Un error de refetch transitorio no debe descartar la tabla ya cargada; solo
  // se trata como error "de pantalla completa" si la consulta nunca cargó.
  const showError = isInitialLoadError(isError, hasLoaded);

  const handleEdit = (banco: Banco) => {
    setSelectedBank(banco);
    setIsDialogOpen(true);
  };

  const handleNew = () => {
    setSelectedBank(null);
    setIsDialogOpen(true);
  };

  // No dependen de nada: callbacks y "en vuelo" llegan al menú por
  // `BankRowActionsProvider`, así una acción no remonta las celdas.
  const columns = withHeaderFilters(getColumns(), banks, BANK_HEADER_FILTERS);

  // `DataTable` se monta SIEMPRE: recibe `isLoading`/`isError` y alterna solo su
  // cuerpo, de modo que el toolbar —búsqueda, filtro, refrescar, columnas y el
  // botón "+ Nuevo Banco"— sigue disponible durante la carga y ante un error.
  // El listado no se gatea con permisos de acción: el backend de finanzas solo
  // exige `IsAuthenticated` y no existen códigos de permiso para bancos.
  return (
    <BankRowActionsProvider
      value={{
        onEdit: handleEdit,
        onToggleActivo: toggle.request,
        busyIds,
      }}
    >
      <div className="h-full flex flex-col min-h-0">
        <DataTable
          columns={columns}
          data={banks}
          baseDataCount={banks.length}
          searchPlaceholder="Buscar banco por nombre, código o SWIFT..."
          fillHeight
          onRefetch={refetch}
          isRefetching={isFetching}
          emptyMessage="No hay bancos registrados."
          isLoading={isLoading}
          isError={showError}
          errorTitle="Error al cargar los bancos"
          errorMessage={extractErrorMessage(error, "No se pudo cargar la información.")}
          loadingAriaLabel="Cargando bancos"
          // Ata la identidad de la fila al id del registro y no a su índice:
          // activar/desactivar cambia `activo`, que es un filtro.
          getRowId={(row) => String(row.id)}
          actionButton={
            <MainDialog
              title={
                <DialogHeader
                  title={selectedBank ? "Editar Banco" : "Alta de Banco"}
                  subtitle={selectedBank ? "Edición de registro" : "Registro Nuevo"}
                  statusColor="emerald"
                  icon={BancosIcon}
                />
              }
              open={isDialogOpen}
              onOpenChange={setIsDialogOpen}
              maxWidth={DIALOG_WIDTH_FORM}
              trigger={
                <Button
                  variant="primary"
                  rounded="full"
                  onClick={handleNew}
                  className="hover:scale-105 active:scale-95"
                >
                  + Nuevo Banco
                </Button>
              }
            >
              <BankForm onSuccess={() => setIsDialogOpen(false)} bankToEdit={selectedBank} />
            </MainDialog>
          }
        />

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
            title={toggleSnapshot.activo ? "Desactivar Banco" : "Activar Banco"}
            description={
              toggleSnapshot.activo
                ? `¿Deseas desactivar el banco ${getBankLabel(toggleSnapshot)}? Su información se conserva y seguirá visible en el listado con estatus Inactivo.`
                : `¿Deseas activar el banco ${getBankLabel(toggleSnapshot)}? Volverá a estar disponible para su uso.`
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
    </BankRowActionsProvider>
  );
}
