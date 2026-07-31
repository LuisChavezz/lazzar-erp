"use client";

import { useState } from "react";
import { createColumnHelper, type ColumnDef } from "@tanstack/react-table";
import { ViewIcon } from "@/src/components/Icons";
import { ActionMenu, type ActionMenuItem } from "@/src/components/ActionMenu";
import { StatusBadge } from "@/src/components/StatusBadge";
import { RFID_LABEL_ESTADO_CONFIG } from "../constants/rfidLabelStatus";
import { RfidLabelDetailDialog } from "./RfidLabelDetailDialog";
import type { RfidLabel } from "../interfaces/rfid-label.interface";

// ── Celda de acciones ────────────────────────────────────────────────────────

const ActionsCell = ({ row }: { row: RfidLabel }) => {
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const menuItems: ActionMenuItem[] = [
    { label: "Ver Detalles", icon: ViewIcon, onSelect: () => setIsDetailOpen(true) },
  ];

  return (
    <div className="flex items-center justify-center">
      <ActionMenu items={menuItems} ariaLabel={`Acciones de la etiqueta ${row.sku}`} />
      {/* Montaje condicional: el diálogo no existe hasta abrirlo. Sin fetch
          propio — `row` YA es el registro completo (ZPL e impresora
          incluidos). Mismo patrón que `DispatchColumns`. */}
      {isDetailOpen && (
        <RfidLabelDetailDialog rfidLabel={row} open={true} onOpenChange={setIsDetailOpen} />
      )}
    </div>
  );
};

const columnHelper = createColumnHelper<RfidLabel>();

/**
 * Columnas del listado de etiquetas RFID. Color y talla viajan como campos
 * separados (ver `rfid-label.interface.ts`) pero se presentan juntos en una sola
 * columna "Variante": en un listado identifican UNA variante, no dos datos
 * independientes que se filtren por separado. El desglose en columnas propias
 * se queda para el detalle, igual que en `DispatchDetailDialog`.
 */
export const rfidLabelColumns = [
  columnHelper.accessor("sku", {
    header: "SKU",
    cell: (info) => (
      <span className="font-mono text-slate-700 dark:text-slate-200 font-semibold">
        {info.getValue()}
      </span>
    ),
  }),
  columnHelper.accessor("producto_nombre", {
    header: "Producto",
    cell: (info) => (
      <span className="text-sm text-slate-700 dark:text-slate-200">{info.getValue()}</span>
    ),
  }),
  // `accessorFn` (no `display`) para que la búsqueda global de `DataTable`
  // encuentre "Azul Marino" o "XG" en esta columna.
  columnHelper.accessor((row) => `${row.color_nombre} / ${row.talla_nombre}`, {
    id: "variante",
    header: "Variante",
    cell: (info) => (
      <span className="text-sm text-slate-600 dark:text-slate-300">{info.getValue()}</span>
    ),
  }),
  columnHelper.accessor("estado", {
    header: "Última impresión",
    size: 150,
    cell: (info) => <StatusBadge status={info.getValue()} config={RFID_LABEL_ESTADO_CONFIG} />,
  }),
  columnHelper.display({
    id: "actions",
    header: () => <div className="text-center">Acciones</div>,
    cell: ({ row }) => <ActionsCell row={row.original} />,
  }),
] as ColumnDef<RfidLabel>[];
