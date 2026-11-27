"use client";

import { createColumnHelper, type ColumnDef } from "@tanstack/react-table";
import { ViewIcon } from "@/src/components/Icons";
import { ActionMenu, type ActionMenuItem } from "@/src/components/ActionMenu";
import { StatusBadge } from "@/src/components/StatusBadge";
import { textOrDash } from "@/src/components/DetailDialogPrimitives";
import { formatShortDate, formatShortTime } from "@/src/utils/formatDate";
import { RFID_LABEL_STATUS_CONFIG } from "../constants/rfidLabelStatus";
import { useRfidLabelRowActionsContext } from "../hooks/rfidLabelRowActionsContext";
import type { EtiquetaRFIDRow } from "../interfaces/rfid-label.interface";

// ── Celda de acciones ────────────────────────────────────────────────────────

/** Solo abre el detalle: el diálogo vive en `RfidLabelsView`, no aquí (la
 *  celda se desmonta al paginar, ordenar o refrescar). */
const ActionsCell = ({ row }: { row: EtiquetaRFIDRow }) => {
  const { onViewDetail } = useRfidLabelRowActionsContext();
  const menuItems: ActionMenuItem[] = [
    { label: "Ver Detalles", icon: ViewIcon, onSelect: () => onViewDetail(row) },
  ];

  return (
    <div className="flex items-center justify-center">
      <ActionMenu items={menuItems} ariaLabel={`Acciones de la impresión ${row.folio}`} />
    </div>
  );
};

const columnHelper = createColumnHelper<EtiquetaRFIDRow>();

/**
 * Columnas del historial de impresiones de etiquetas RFID. El grano es UN
 * EVENTO DE IMPRESIÓN (`EtiquetaRFIDImpresion`), no una etiqueta/SKU vigente:
 * el mismo SKU puede repetirse en varios renglones (reimpresiones), y eso es
 * intencional — es un log, no un catálogo. Ver `rfid-label.interface.ts`.
 */
export const rfidLabelColumns = [
  columnHelper.accessor("folio", {
    header: "Folio",
    cell: (info) => (
      <span className="font-mono text-slate-700 dark:text-slate-200 font-semibold">
        {info.getValue()}
      </span>
    ),
  }),
  // `accessorFn` que colapsa `null` a `""` — mismo bug de
  // `getColumnCanGlobalFilter`/`flatRows[0]` que ya documenta
  // `CorteMangaOrderColumns.tsx`. `id` explícito conserva la
  // visibilidad/orden de columna que guarda `DataTable`. Escenario común: el
  // listado es un log ordenado por fecha descendente, así que la primera fila
  // es la impresión más reciente, que bien puede ser por producto (sin
  // variante y por tanto sin SKU).
  columnHelper.accessor((row) => row.sku ?? "", {
    id: "sku",
    header: "SKU",
    // `null` cuando la impresión se registró por producto, sin variante.
    cell: (info) => (
      <span className="font-mono text-slate-700 dark:text-slate-200 font-semibold">
        {textOrDash(info.getValue())}
      </span>
    ),
  }),
  columnHelper.accessor("producto_nombre", {
    header: "Producto",
    cell: (info) => (
      <span className="text-sm text-slate-700 dark:text-slate-200">{info.getValue()}</span>
    ),
  }),
  // Mismo `accessorFn` y mismo motivo que `sku` (ver el bloque de arriba):
  // `producto_variante_nombre` es `null` en las impresiones por producto.
  columnHelper.accessor((row) => row.producto_variante_nombre ?? "", {
    id: "producto_variante_nombre",
    header: "Variante",
    // Compuesto "Producto - Color - Talla" armado por el backend — se muestra
    // tal cual, no se separa en color/talla (no hay campos sueltos que leer).
    cell: (info) => (
      <span className="text-sm text-slate-600 dark:text-slate-300">
        {textOrDash(info.getValue())}
      </span>
    ),
  }),
  columnHelper.accessor("cantidad", {
    header: "Cantidad",
    meta: { align: "right" },
    cell: (info) => (
      <span className="text-sm tabular-nums text-slate-700 dark:text-slate-200">
        {info.getValue()}
      </span>
    ),
  }),
  columnHelper.accessor("status", {
    header: "Estatus",
    size: 130,
    cell: (info) => <StatusBadge status={info.getValue()} config={RFID_LABEL_STATUS_CONFIG} />,
  }),
  columnHelper.accessor("created_at", {
    header: "Fecha",
    sortingFn: "datetime",
    cell: (info) => {
      const raw = info.getValue();
      return (
        <div className="flex flex-col leading-tight">
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            {formatShortDate(raw)}
          </span>
          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
            {formatShortTime(raw)}
          </span>
        </div>
      );
    },
  }),
  columnHelper.display({
    id: "actions",
    header: "Acciones",
    meta: { align: "center" },
    cell: ({ row }) => <ActionsCell row={row.original} />,
  }),
] as ColumnDef<EtiquetaRFIDRow>[];
