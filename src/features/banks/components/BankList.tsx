"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { DataTable } from "@/src/components/DataTable";
import { Button } from "@/src/components/Button";
import { MainDialog } from "@/src/components/MainDialog";
import { ConfirmDialog } from "@/src/components/ConfirmDialog";
import { DialogHeader } from "@/src/components/DialogHeader";
import { BancosIcon } from "@/src/components/Icons";
import { withHeaderFilters } from "@/src/components/withHeaderFilters";
import { useDialogSession } from "@/src/hooks/useDialogSession";
import { DIALOG_WIDTH_FORM } from "@/src/constants/dialogWidths";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { isInitialLoadError } from "@/src/utils/isInitialLoadError";
import { getStaleRowDialogNotice, type StaleRowDialogNotice } from "@/src/utils/staleRowDialogNotice";
import { BANK_HEADER_FILTERS, getBankLabel, getColumns } from "./BankColumns";
import { Banco } from "../interfaces/bank.interface";
import BankForm from "./BankForm";
import { useBanks } from "../hooks/useBanks";
import { useToggleBankActivo } from "../hooks/useToggleBankActivo";
import { BankRowActionsProvider, usePendingBankIds } from "../hooks/useBankRowActions";
import { BANK_STALE_MESSAGES } from "../utils/bankStaleMessages";

/** Confirmación de activar/desactivar abierta: el id y el `activo` que tenía al abrirse. */
interface ToggleTarget {
  id: number;
  activo: boolean;
}

export default function BankList() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedBank, setSelectedBank] = useState<Banco | null>(null);
  // Diálogo de fila EN LA VISTA, no en la celda: una celda se desmonta al
  // ordenar, filtrar o paginar, y activar/desactivar cambia `activo`, que es un
  // filtro. Solo el id (y el `activo` de la apertura), resuelto contra el
  // listado completo.
  const [toggleTarget, setToggleTarget] = useState<ToggleTarget | null>(null);
  // Aviso de la confirmación que se cerró porque su banco cambió por fuera. Se
  // dispara desde un efecto: un toast en pleno render actualizaría otro
  // componente (el Toaster).
  const [staleNotice, setStaleNotice] = useState<StaleRowDialogNotice | null>(null);
  const { banks, hasLoaded, isLoading, isError, error, refetch, isFetching } = useBanks();
  const { mutate: toggleActivo, isPending: isTogglePending } = useToggleBankActivo();
  const busyIds = usePendingBankIds();

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

  // ── Diálogo de fila, resuelto contra el listado COMPLETO ──────────────────
  const toggleBanco =
    toggleTarget !== null ? (banks.find((banco) => banco.id === toggleTarget.id) ?? null) : null;
  // En vuelo: el "en vuelo" por fila de la caché o la mutación propia, que
  // sigue pendiente hasta que su `onSettled` cierra el diálogo.
  const isToggling =
    toggleTarget !== null && (busyIds.includes(toggleTarget.id) || isTogglePending);

  // Vía rápida contra la caché: un refetch mostró que el banco de la
  // confirmación abierta ya no existe (el DELETE del backend es físico y
  // alcanzable fuera de esta pantalla) o ya tiene otro `activo` que el que tenía
  // al abrirse. Se cierra con un aviso (mismo patrón que `AreaList`). Ajuste en
  // render, no en un efecto.
  const staleToggle = getStaleRowDialogNotice({
    resource: "bank",
    targetId: toggleTarget?.id ?? null,
    target: toggleBanco,
    expectedActivo: toggleTarget?.activo ?? true,
    isBusy: isToggling,
    messages: BANK_STALE_MESSAGES,
  });
  if (staleToggle) {
    setToggleTarget(null);
    setStaleNotice(staleToggle);
  }

  useEffect(() => {
    if (staleNotice) {
      // `id` estable: un doble render no duplica el aviso.
      toast.error(staleNotice.message, { id: staleNotice.key });
    }
  }, [staleNotice]);

  // Copia del banco al ABRIR la confirmación: el texto no sigue a los refetch
  // (ni al optimista, que invierte `activo` al confirmar) y sobrevive a la
  // animación de salida cuando el objetivo vuelve a `null`.
  const toggleSession = useDialogSession(toggleTarget !== null, toggleBanco);
  const toggleSnapshot = toggleSession.snapshot;

  // `DataTable` se monta SIEMPRE: recibe `isLoading`/`isError` y alterna solo su
  // cuerpo, de modo que el toolbar —búsqueda, filtro, refrescar, columnas y el
  // botón "+ Nuevo Banco"— sigue disponible durante la carga y ante un error.
  // El listado no se gatea con permisos de acción: el backend de finanzas solo
  // exige `IsAuthenticated` y no existen códigos de permiso para bancos.
  return (
    <BankRowActionsProvider
      value={{
        onEdit: handleEdit,
        onToggleActivo: (banco) => setToggleTarget({ id: banco.id, activo: banco.activo }),
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
            key={toggleSession.id}
            open={toggleTarget !== null}
            onOpenChange={(open) => {
              if (!open) setToggleTarget(null);
            }}
            title={toggleSnapshot.activo ? "Desactivar Banco" : "Activar Banco"}
            description={
              toggleSnapshot.activo
                ? `¿Deseas desactivar el banco ${getBankLabel(toggleSnapshot)}? Su información se conserva y seguirá visible en el listado con estatus Inactivo.`
                : `¿Deseas activar el banco ${getBankLabel(toggleSnapshot)}? Volverá a estar disponible para su uso.`
            }
            confirmText={
              toggleSnapshot.activo
                ? isToggling
                  ? "Desactivando..."
                  : "Desactivar"
                : isToggling
                  ? "Activando..."
                  : "Activar"
            }
            closeOnConfirm={false}
            busy={isToggling}
            onConfirm={() => {
              toggleActivo(
                { id: toggleSnapshot.id, activo: !toggleSnapshot.activo },
                { onSettled: () => setToggleTarget(null) },
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
