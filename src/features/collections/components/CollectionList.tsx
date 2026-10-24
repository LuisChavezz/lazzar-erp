"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { DataTable } from "@/src/components/DataTable";
import { Button } from "@/src/components/Button";
import { MainDialog } from "@/src/components/MainDialog";
import { DialogHeader } from "@/src/components/DialogHeader";
import { hasPermission } from "@/src/utils/permissions";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { getCollectionColumns } from "./CollectionColumns";
import { CollectionDetailDialog } from "./CollectionDetailDialog";
import { CreateCobroForm } from "./CreateCobroForm";
import { CobroRepStampDialog } from "./CobroRepStampDialog";
import { CobroRepCancelDialog } from "./CobroRepCancelDialog";
import { COBRO_CREATE_PERMISSION } from "../constants/collectionPermissions";
import { CollectionRowActionsProvider } from "../hooks/useCollectionRowActions";
import { canStampCobroRep } from "../utils/cobroRepStamping";
import { canOfferCobroCancel } from "../utils/cobroCancellation";
import { canCancelCobroRep } from "../utils/cobroRepCancellation";
import { hasRepDownloadPermission } from "../utils/cobroRepDownload";
import { CollectionCancelDialog } from "./CollectionCancelDialog";
import { CobroDraftEditDialog } from "./CobroDraftEditDialog";
import { CobroDraftApplyDialog } from "./CobroDraftApplyDialog";
import { CobroDraftDeleteDialog } from "./CobroDraftDeleteDialog";
import { canManageCobroDraft, isDeletableCobroDraft } from "../utils/cobroDraft";
import { useBankAccounts } from "@/src/features/bank-accounts/hooks/useBankAccounts";
import { useCobros } from "../hooks/useCobros";
import { mapCobrosToRows, type CobroRow } from "../utils/collection.utils";

export function CollectionList() {
  const { cobros, isLoading, isFetching, isInitialError, error, refetch } = useCobros();
  const { bankAccounts } = useBankAccounts();
  // Ver la lista exige `R-CONTABILIDAD-CXC` (lo aplica `proxy.ts`); registrar un
  // cobro exige además el permiso que valida el backend. `hasPermission` deja
  // pasar a `role === "admin"`.
  const { data: session } = useSession();
  const canCreate = hasPermission(COBRO_CREATE_PERMISSION, session?.user);
  const [isFormOpen, setIsFormOpen] = useState(false);

  // La moneda de cada cobro (la de su cuenta bancaria) se resuelve UNA vez aquí.
  // Cuando el catálogo termina de cargar cambian los objetos de fila, no su
  // identidad (`getRowId`), así que las celdas se actualizan sin remontarse.
  const rows = mapCobrosToRows(cobros, bankAccounts);

  // Estado de los diálogos en la VISTA, no en la celda: una celda se desmonta al
  // ordenar, filtrar o paginar, y el estatus del cobro (uno de los filtros)
  // cambia al cancelar; los diálogos de acción viven aquí, con su id objetivo.
  const [openDetailId, setOpenDetailId] = useState<number | null>(null);
  // Timbrar el REP: se abre desde el detalle o desde el menú de la fila. El id
  // vive aquí y el diálogo toma su copia al abrir (`useDialogSession`), porque
  // la fila se relee tras timbrar.
  const [stampRepId, setStampRepId] = useState<number | null>(null);
  const stampRepCobro = stampRepId !== null ? rows.find((row) => row.id === stampRepId) ?? null : null;
  // Cancelar el REP: solo desde el detalle. El diálogo toma su copia al abrir,
  // porque la fila se relee sin `rep_uuid` tras cancelar.
  const [cancelRepId, setCancelRepId] = useState<number | null>(null);
  const cancelRepCobro = cancelRepId !== null ? rows.find((row) => row.id === cancelRepId) ?? null : null;
  // Cancelar: solo desde el detalle. El diálogo toma su copia al abrir, así que
  // sigue coherente aunque la fila pase a `Cancelado` y salga de un filtro.
  const [cancelId, setCancelId] = useState<number | null>(null);
  const cancelCobro = cancelId !== null ? rows.find((row) => row.id === cancelId) ?? null : null;
  // Editar un borrador: solo desde el detalle. El diálogo toma su copia al abrir
  // y no la suelta aunque la fila se relea (o pase a `Aplicado`) mientras edita.
  const [editId, setEditId] = useState<number | null>(null);
  const editCobro = editId !== null ? rows.find((row) => row.id === editId) ?? null : null;
  // Aplicar y eliminar un borrador: solo desde el detalle; cada diálogo toma su
  // copia al abrir (la fila cambia de estatus o desaparece al terminar).
  const [applyId, setApplyId] = useState<number | null>(null);
  const applyCobro = applyId !== null ? rows.find((row) => row.id === applyId) ?? null : null;
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const deleteCobro = deleteId !== null ? rows.find((row) => row.id === deleteId) ?? null : null;

  const columns = getCollectionColumns({ onViewDetail: setOpenDetailId });

  // "Timbrar REP" depende de la sesión: va por contexto para que las columnas
  // no cambien (y las celdas no se remonten) cuando la sesión se resuelve.
  const rowActions = {
    canStampRep: (cobro: CobroRow) => canStampCobroRep(cobro, session?.user),
    onStampRep: setStampRepId,
  };

  // El cobro abierto se busca en el arreglo ya cargado: listado y retrieve
  // comparten `CobroSerializer`, líneas incluidas. Al refrescarse la lista el
  // diálogo muestra la versión vigente del renglón.
  const detailCobro =
    openDetailId !== null ? rows.find((row) => row.id === openDetailId) ?? null : null;

  // El id no puede sobrevivir a la desaparición de su renglón: un refetch
  // posterior que lo devolviera reabriría el diálogo solo. Se ajusta en RENDER
  // (estado derivado), no en un efecto. Mientras la lista aún no carga no hay
  // renglones y tampoco hay id abierto, así que no interfiere.
  if (openDetailId !== null && detailCobro === null) {
    setOpenDetailId(null);
  }

  // Acciones de borrador del detalle: un borrador sin folio se ELIMINA (no deja
  // hueco en la serie); con folio, o aplicado, se cancela.
  const canManageDraft = detailCobro !== null && canManageCobroDraft(detailCobro, session?.user);
  const isDeletableDraft = detailCobro !== null && isDeletableCobroDraft(detailCobro);

  // `DataTable` se monta SIEMPRE: recibe `isLoading`/`isError` y alterna solo su
  // cuerpo, de modo que el toolbar (búsqueda, filtros, refrescar, columnas y el
  // botón "+ Nuevo cobro" en `actionButton`) sigue disponible durante la carga y
  // ante un error.
  return (
    <CollectionRowActionsProvider value={rowActions}>
      <DataTable
        columns={columns}
        data={rows}
        searchPlaceholder="Buscar por cliente, referencia o cuenta..."
        onRefetch={refetch}
        isRefetching={isFetching}
        emptyMessage="No hay cobros registrados."
        isLoading={isLoading}
        isError={isInitialError}
        errorTitle="Error al cargar los cobros"
        errorMessage={extractErrorMessage(error, "No se pudo cargar la información.")}
        onErrorRetry={refetch}
        loadingAriaLabel="Cargando cobros"
        getRowId={(row) => String(row.id)}
        // Un alta nueva aparece tras invalidar; sin esto, quien esté en la
        // página 2 no vería el cobro que acaba de registrar.
        paginationResetKey={rows.length}
        actionButton={
          canCreate ? (
            <MainDialog
              title={
                <DialogHeader
                  title="Registrar Cobro"
                  subtitle="Aplicación contra cuentas por cobrar"
                  statusColor="emerald"
                />
              }
              open={isFormOpen}
              onOpenChange={setIsFormOpen}
              maxWidth="1100px"
              trigger={
                <Button variant="primary" rounded="full" className="hover:scale-105 active:scale-95">
                  + Nuevo cobro
                </Button>
              }
            >
              {/* Montado solo con el diálogo abierto: los catálogos se piden bajo
                  demanda y cada alta arranca limpia. */}
              {isFormOpen && <CreateCobroForm onSuccess={() => setIsFormOpen(false)} />}
            </MainDialog>
          ) : undefined
        }
      />

      {detailCobro && (
        <CollectionDetailDialog
          cobro={detailCobro}
          open={true}
          onOpenChange={(open) => {
            if (!open) setOpenDetailId(null);
          }}
          onStampRep={
            canStampCobroRep(detailCobro, session?.user) ? () => setStampRepId(detailCobro.id) : undefined
          }
          onCancelRep={
            canCancelCobroRep(detailCobro, session?.user) ? () => setCancelRepId(detailCobro.id) : undefined
          }
          onCancel={
            canOfferCobroCancel(detailCobro, session?.user) && !isDeletableDraft
              ? () => setCancelId(detailCobro.id)
              : undefined
          }
          onEdit={canManageDraft ? () => setEditId(detailCobro.id) : undefined}
          onApply={canManageDraft ? () => setApplyId(detailCobro.id) : undefined}
          onDelete={canManageDraft && isDeletableDraft ? () => setDeleteId(detailCobro.id) : undefined}
          hasRepDownloadPermission={hasRepDownloadPermission(session?.user)}
        />
      )}

      {/* Montado siempre: la copia de `useDialogSession` sobrevive a la
          animación de cierre y a que la fila se relea o desaparezca. */}
      <CobroRepStampDialog
        cobro={stampRepCobro}
        open={stampRepId !== null}
        onOpenChange={(open) => {
          if (!open) setStampRepId(null);
        }}
      />

      <CobroRepCancelDialog
        cobro={cancelRepCobro}
        open={cancelRepId !== null}
        onOpenChange={(open) => {
          if (!open) setCancelRepId(null);
        }}
      />

      <CobroDraftEditDialog
        cobro={editCobro}
        open={editId !== null}
        onOpenChange={(open) => {
          if (!open) setEditId(null);
        }}
      />

      <CobroDraftApplyDialog
        cobro={applyCobro}
        open={applyId !== null}
        onOpenChange={(open) => {
          if (!open) setApplyId(null);
        }}
      />

      <CobroDraftDeleteDialog
        cobro={deleteCobro}
        open={deleteId !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteId(null);
        }}
      />

      <CollectionCancelDialog
        cobro={cancelCobro}
        open={cancelId !== null}
        onOpenChange={(open) => {
          if (!open) setCancelId(null);
        }}
      />
    </CollectionRowActionsProvider>
  );
}
