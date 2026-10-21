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
import { COBRO_CREATE_PERMISSION } from "../constants/collectionPermissions";
import { useBankAccounts } from "@/src/features/bank-accounts/hooks/useBankAccounts";
import { useCobros } from "../hooks/useCobros";
import { mapCobrosToRows } from "../utils/collection.utils";

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

  // Estado del diálogo en la VISTA, no en la celda: una celda se desmonta al
  // ordenar, filtrar o paginar, y el estatus del cobro (uno de los filtros)
  // cambiará cuando lleguen cancelar y timbrar (EC-544, EC-527). Esos diálogos
  // se agregarán aquí mismo, con su id objetivo junto a `openDetailId`.
  const [openDetailId, setOpenDetailId] = useState<number | null>(null);

  const columns = getCollectionColumns({ onViewDetail: setOpenDetailId });

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

  // `DataTable` se monta SIEMPRE: recibe `isLoading`/`isError` y alterna solo su
  // cuerpo, de modo que el toolbar (búsqueda, filtros, refrescar, columnas y el
  // botón "+ Nuevo cobro" en `actionButton`) sigue disponible durante la carga y
  // ante un error.
  return (
    <>
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
        />
      )}
    </>
  );
}
