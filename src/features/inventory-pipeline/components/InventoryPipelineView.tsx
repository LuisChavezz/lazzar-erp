"use client";

import { useState } from "react";
import { DataTable } from "@/src/components/DataTable";
import { QuickFilterChips } from "@/src/components/QuickFilterChips";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { isInitialLoadError } from "@/src/utils/isInitialLoadError";
import {
  buildInventoryPipelineFilterOptions,
  getInventoryPipelineColumns,
} from "./InventoryPipelineColumns";
import type { InventoryPipelineRow } from "../interfaces/inventory-pipeline.interface";

/**
 * Atajos de un clic sobre la tabla para las preguntas más comunes al planear.
 * Filtran el arreglo que recibe `DataTable` (en memoria; el reporte llega
 * completo) y se combinan con la búsqueda y los filtros de encabezado.
 */
const QUICK_FILTERS: {
  key: string;
  label: string;
  dotClassName: string;
  matches: (row: InventoryPipelineRow) => boolean;
}[] = [
  { key: "todos", label: "Todos", dotClassName: "bg-slate-400", matches: () => true },
  { key: "con-existencia", label: "Con existencia", dotClassName: "bg-emerald-500", matches: (r) => r.disponible > 0 },
  { key: "sin-existencia", label: "Sin existencia", dotClassName: "bg-rose-500", matches: (r) => r.disponible <= 0 },
  { key: "en-produccion", label: "En producción", dotClassName: "bg-indigo-500", matches: (r) => r.enOp > 0 },
  { key: "con-compras", label: "Con compras pendientes", dotClassName: "bg-amber-500", matches: (r) => r.comprasPendientes > 0 },
];
import { InventoryPipelineDetailDialog } from "./InventoryPipelineDetailDialog";
import { useInventoryPipeline } from "../hooks/useInventoryPipeline";

/**
 * Reporte de existencias, producción y compras por producto (Mesa de Control).
 * Solo lectura: un renglón por producto con disponible, cantidad en OP
 * abiertas, total y compras pendientes; el desglose por talla y las órdenes
 * abiertas viven en `InventoryPipelineDetailDialog`.
 *
 * Sin filtros de sucursal/almacén/empresa a propósito (ver
 * `getInventoryPipeline`). La búsqueda global cubre código y descripción.
 *
 * El diálogo se abre por `productoId` con el estado AQUÍ, no en la celda: un
 * refetch u ordenamiento desmontaría una celda con el diálogo abierto. Con
 * `getRowId` atando la identidad al producto, la fila se re-localiza en
 * `rows` y el diálogo sobrevive. Mismo patrón que `CorteMangaOrdersView`.
 *
 * `DataTable` se monta SIEMPRE y alterna solo su área de datos con
 * `isLoading`/`isError`, así que el toolbar queda visible durante la carga y el
 * error. `{"resultados": []}` cae en el estado vacío normal de la tabla.
 */
export function InventoryPipelineView() {
  const { rows, isLoading, isError, error, hasLoaded, refetch, isFetching } =
    useInventoryPipeline();
  const [openProductoId, setOpenProductoId] = useState<number | null>(null);
  const [quickFilterKey, setQuickFilterKey] = useState("todos");
  const quickFilter = QUICK_FILTERS.find((f) => f.key === quickFilterKey) ?? QUICK_FILTERS[0];
  const visibleRows = rows.filter(quickFilter.matches);

  // Error de pantalla completa solo si nunca cargó; un refetch fallido con
  // datos en caché conserva la tabla y avisa por toast (`useHasLoadedQuery`).
  const showError = isInitialLoadError(isError, hasLoaded);
  const columns = getInventoryPipelineColumns(
    setOpenProductoId,
    buildInventoryPipelineFilterOptions(rows),
  );

  const openRow =
    openProductoId !== null ? rows.find((row) => row.productoId === openProductoId) : undefined;

  // Si un refetch saca del reporte el producto abierto, se olvida su id (no
  // basta con dejar de pintar el diálogo): si no, un refetch posterior que lo
  // devolviera reabriría el diálogo sin que nadie hiciera clic. Ajuste de
  // estado durante el render, guardado por la condición para no ciclar.
  if (openProductoId !== null && hasLoaded && !openRow) {
    setOpenProductoId(null);
  }

  // Altura acotada a la ventana (mismo cálculo que el resto de Mesa de
  // Control) + `fillHeight`: la tabla aprovecha toda la pantalla y scrollea
  // por dentro, en vez de quedarse a media altura.
  return (
    <div className="h-[calc(100dvh-128px)] min-h-[480px] flex flex-col gap-3">
      <QuickFilterChips
        label="Atajos de filtro"
        value={quickFilterKey}
        onChange={setQuickFilterKey}
        chips={QUICK_FILTERS.map((filter) => ({
          key: filter.key,
          label: filter.label,
          dotClassName: filter.dotClassName,
          count: hasLoaded ? rows.filter(filter.matches).length : undefined,
        }))}
      />
      <DataTable
        columns={columns}
        data={visibleRows}
        baseDataCount={rows.length}
        fillHeight
        searchPlaceholder="Buscar código o producto…"
        getRowId={(row) => String(row.productoId)}
        onRefetch={refetch}
        isRefetching={isFetching}
        emptyMessage="No hay productos que reportar."
        isLoading={isLoading}
        isError={showError}
        errorTitle="Error al cargar el reporte de existencias, producción y compras"
        errorMessage={extractErrorMessage(error, "No se pudo cargar la información.")}
        onErrorRetry={refetch}
        loadingAriaLabel="Cargando reporte de existencias, producción y compras"
      />

      {/* Sin endpoint de detalle al cual recurrir: si el producto sale del
          reporte, el diálogo se cierra (ver el ajuste de `openProductoId`). */}
      {openRow && (
        <InventoryPipelineDetailDialog
          row={openRow}
          open={true}
          onOpenChange={(open) => {
            if (!open) setOpenProductoId(null);
          }}
        />
      )}
    </div>
  );
}
