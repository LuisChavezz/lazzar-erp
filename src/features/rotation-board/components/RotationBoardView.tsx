"use client";

import { useState } from "react";
import { DataTable } from "@/src/components/DataTable";
import { useRotationBoardTable } from "../hooks/useRotationBoardTable";
import type { RotationBoardRow } from "../interfaces/rotation-board.interface";
import { getRotationBoardColumns } from "./RotationBoardColumns";
import { RotationBoardControls } from "./RotationBoardControls";
import { RotationBoardKpis } from "./RotationBoardKpis";
import { VariantMaterialsDialog } from "./VariantMaterialsDialog";

/**
 * Tablero de rotación de producto terminado (Planeación, EC-867), en MODO
 * SERVIDOR: filtros, búsqueda, orden, paginación y parámetros de cálculo los
 * resuelve el backend y su estado vive en la URL (`useRotationBoardTable`),
 * así que la página lo envuelve en `<Suspense>`.
 *
 * - Las tarjetas y el periodo salen de la MISMA respuesta que la tabla
 *   (`resumen`, `parametros`): durante una consulta nueva muestran la anterior
 *   (placeholder), igual que las filas.
 * - `DataTable` se monta siempre: su toolbar sigue durante la carga o un error.
 * - El detalle de materiales vive aquí, no en la celda (las celdas se
 *   desmontan al paginar, ordenar o filtrar), y recibe la sucursal del filtro
 *   para que su desglose sea el de la fila.
 */
export function RotationBoardView() {
  const board = useRotationBoardTable();
  const [detailRow, setDetailRow] = useState<RotationBoardRow | null>(null);

  const response = board.response;
  const { semanas, semanas_objetivo, dias_sin_venta } = board.settings;

  const columns = getRotationBoardColumns({
    isProductMode: board.isProductMode,
    hasta: response?.parametros.hasta,
    onOpenDetail: setDetailRow,
  });

  return (
    <div className="w-full space-y-4">
      <RotationBoardKpis
        resumen={response?.resumen}
        isLoading={board.tableProps.isLoading}
        isActive={board.isShortcutActive}
        onToggle={board.toggleShortcut}
      />

      <RotationBoardControls
        semanas={semanas}
        semanasObjetivo={semanas_objetivo}
        diasSinVenta={dias_sin_venta}
        agrupar={board.agrupar}
        sucursal={board.sucursal}
        parametros={response?.parametros}
        onSemanasChange={(value) => board.setSetting("semanas", value)}
        onSemanasObjetivoChange={(value) => board.setSetting("semanas_objetivo", value)}
        onDiasSinVentaChange={(value) => board.setSetting("dias_sin_venta", value)}
        onAgruparChange={board.setAgrupar}
        onSucursalChange={board.setSucursal}
        onReset={board.resetSettings}
      />

      {/* `key`: cada agrupación tiene su juego de columnas; remontar la tabla
          descarta el orden y la visibilidad de columnas que ya no existen. */}
      <DataTable
        key={board.agrupar}
        columns={columns}
        {...board.tableProps}
        getRowId={(row) =>
          row.variante_id !== null ? `v-${row.variante_id}` : `p-${row.producto_id}`
        }
        searchPlaceholder={
          board.isProductMode
            ? "Buscar por nombre de producto..."
            : "Buscar por SKU o nombre de producto o variante..."
        }
        emptyMessage="No hay artículos con estos criterios"
        errorTitle="Error al cargar el tablero de rotación"
        loadingAriaLabel="Cargando tablero de rotación"
      />

      <VariantMaterialsDialog
        row={detailRow}
        sucursal={board.sucursal}
        onClose={() => setDetailRow(null)}
      />
    </div>
  );
}
