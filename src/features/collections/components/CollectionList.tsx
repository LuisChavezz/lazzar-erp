"use client";

import { useState } from "react";
import { DataTable } from "@/src/components/DataTable";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { getCollectionColumns } from "./CollectionColumns";
import { CollectionDetailDialog } from "./CollectionDetailDialog";
import { useBankAccounts } from "@/src/features/bank-accounts/hooks/useBankAccounts";
import { useCobros } from "../hooks/useCobros";
import { mapCobrosToRows } from "../utils/collection.utils";

export function CollectionList() {
  const { cobros, isLoading, isFetching, isInitialError, error, refetch } = useCobros();
  const { bankAccounts } = useBankAccounts();

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
  // cuerpo, de modo que el toolbar (búsqueda, filtros, refrescar, columnas y,
  // con EC-543, el botón de alta en `actionButton`) sigue disponible durante la
  // carga y ante un error.
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
