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
import { DIALOG_WIDTH_SECTIONED_FORM } from "@/src/constants/dialogWidths";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { isInitialLoadError } from "@/src/utils/isInitialLoadError";
import { BANK_ACCOUNT_HEADER_FILTERS, getBankAccountLabel, getColumns } from "./BankAccountColumns";
import { BankAccountSummaryDialog } from "./BankAccountSummaryDialog";
import { CuentaBancaria } from "../interfaces/bank-account.interface";
import BankAccountForm from "./BankAccountForm";
import { useBankAccounts } from "../hooks/useBankAccounts";
import { useToggleBankAccountActivo } from "../hooks/useToggleBankAccountActivo";
import {
  BankAccountRowActionsProvider,
  usePendingBankAccountIds,
} from "../hooks/useBankAccountRowActions";
import { BANK_ACCOUNT_STALE_MESSAGES } from "../utils/bankAccountStaleMessages";

export default function BankAccountList() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<CuentaBancaria | null>(null);
  // Estado de los diálogos de fila EN LA VISTA y no en la celda: una celda se
  // desmonta al ordenar, filtrar o paginar, y alternar `activo` con el resumen
  // o la confirmación abiertos puede sacar la fila de la vista filtrada — el
  // diálogo se cerraría solo a media consulta.
  const [openSummaryId, setOpenSummaryId] = useState<number | null>(null);

  const { bankAccounts, hasLoaded, isLoading, isError, error, refetch, isFetching } =
    useBankAccounts();
  const { mutate: toggleActivo, isPending: isTogglePending } = useToggleBankAccountActivo();
  const busyIds = usePendingBankAccountIds();

  // Confirmación de activar/desactivar, resuelta contra el listado COMPLETO:
  // sobrevive a que la fila salga de la vista filtrada (ver `useActivoToggleDialog`).
  const toggle = useActivoToggleDialog({
    rows: bankAccounts,
    busyIds,
    isPending: isTogglePending,
    resource: "bank-account",
    messages: BANK_ACCOUNT_STALE_MESSAGES,
  });
  // Copia del registro al abrir: estrecha el tipo dentro de los callbacks del diálogo.
  const toggleSnapshot = toggle.snapshot;

  // Un error de refetch transitorio no debe descartar la tabla ya cargada; solo
  // se trata como error "de pantalla completa" si la consulta nunca cargó.
  const showError = isInitialLoadError(isError, hasLoaded);

  const handleEdit = (cuenta: CuentaBancaria) => {
    setSelectedAccount(cuenta);
    setIsDialogOpen(true);
  };

  const handleNew = () => {
    setSelectedAccount(null);
    setIsDialogOpen(true);
  };

  // No dependen de nada: callbacks y "en vuelo" llegan al menú por
  // `BankAccountRowActionsProvider`, así una acción no remonta las celdas. Las
  // opciones del filtro de banco salen de las filas (ver
  // `BANK_ACCOUNT_HEADER_FILTERS`).
  const columns = withHeaderFilters(getColumns(), bankAccounts, BANK_ACCOUNT_HEADER_FILTERS);

  // ── Diálogos de fila, resueltos contra el listado COMPLETO ────────────────
  // La cuenta del resumen se busca contra el arreglo que esta vista ya tiene: el
  // diálogo no vuelve a suscribirse al listado solo para localizar un renglón.
  const summaryAccount =
    openSummaryId !== null
      ? bankAccounts.find((cuenta) => cuenta.id === openSummaryId) ?? null
      : null;

  // El id NO puede sobrevivir a la desaparición de su renglón. El DELETE del
  // backend es real y alcanzable fuera de esta pantalla, así que la cuenta puede
  // irse del payload con el resumen abierto: sin esto el diálogo se desmontaba
  // pero `openSummaryId` seguía apuntando al id, y cualquier refetch posterior
  // que devolviera la fila volvía a abrir el diálogo solo, encima de lo que el
  // usuario estuviera haciendo. Se ajusta en RENDER (patrón de "estado derivado"
  // de React, re-render inmediato sin pintar) y no en un efecto, que además
  // dispararía `react-hooks/set-state-in-effect`.
  if (openSummaryId !== null && summaryAccount === null) {
    setOpenSummaryId(null);
  }

  // `DataTable` se monta SIEMPRE: recibe `isLoading`/`isError` y alterna solo su
  // cuerpo, de modo que el toolbar —búsqueda, filtros, refrescar, columnas y el
  // botón "+ Nueva Cuenta"— sigue disponible durante la carga y ante un error.
  // El listado no se gatea con permisos de acción: el backend de finanzas solo
  // exige `IsAuthenticated` y no existen códigos de permiso para cuentas.
  return (
    <BankAccountRowActionsProvider
      value={{
        onViewSummary: (cuenta) => setOpenSummaryId(cuenta.id),
        onEdit: handleEdit,
        onToggleActivo: toggle.request,
        busyIds,
      }}
    >
      <div className="h-full flex flex-col min-h-0 space-y-6">
        <div className="flex-1 min-h-0 flex flex-col">
          <DataTable
            columns={columns}
            data={bankAccounts}
            baseDataCount={bankAccounts.length}
            searchPlaceholder="Buscar alias, banco, titular o número de cuenta..."
            fillHeight
            onRefetch={refetch}
            isRefetching={isFetching}
            emptyMessage="No hay cuentas bancarias registradas."
            isLoading={isLoading}
            isError={showError}
            errorTitle="Error al cargar las cuentas bancarias"
            errorMessage={extractErrorMessage(error, "No se pudo cargar la información.")}
            onErrorRetry={refetch}
            loadingAriaLabel="Cargando cuentas bancarias"
            // Ata la identidad de la fila al id del registro y no a su índice:
            // activar/desactivar cambia `activo`, que es un filtro.
            getRowId={(row) => String(row.id)}
            actionButton={
              <MainDialog
                title={
                  <DialogHeader
                    title={selectedAccount ? "Editar Cuenta Bancaria" : "Alta de Cuenta Bancaria"}
                    subtitle={selectedAccount ? "Edición de registro" : "Registro Nuevo"}
                    statusColor="emerald"
                    icon={BancosIcon}
                  />
                }
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                maxWidth={DIALOG_WIDTH_SECTIONED_FORM}
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
                <BankAccountForm
                  onSuccess={() => setIsDialogOpen(false)}
                  accountToEdit={selectedAccount}
                />
              </MainDialog>
            }
          />
        </div>

        {summaryAccount && (
          <BankAccountSummaryDialog
            account={summaryAccount}
            open={true}
            onOpenChange={(open) => {
              if (!open) setOpenSummaryId(null);
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
            title={toggleSnapshot.activo ? "Desactivar Cuenta Bancaria" : "Activar Cuenta Bancaria"}
            description={
              toggleSnapshot.activo
                ? `¿Deseas desactivar la cuenta ${getBankAccountLabel(toggleSnapshot)}? Su información y sus movimientos se conservan, y seguirá visible en el listado con estatus Inactivo.`
                : `¿Deseas activar la cuenta ${getBankAccountLabel(toggleSnapshot)}? Volverá a estar disponible para su uso.`
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
    </BankAccountRowActionsProvider>
  );
}
