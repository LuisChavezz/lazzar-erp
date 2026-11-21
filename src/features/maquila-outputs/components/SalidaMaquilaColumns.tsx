"use client";

import { SalidaMaquilaPiezas } from "./SalidaMaquilaPiezas";
import { createColumnHelper, type ColumnDef } from "@tanstack/react-table";
import { FolioActionMenu } from "@/src/components/FolioActionMenu";
import { ViewIcon } from "@/src/components/Icons";
import { StatusBadge } from "@/src/components/StatusBadge";
import { formatAmountNoCurrency, formatQuantityValue } from "@/src/utils/formatCurrency";
import { formatShortCalendarDate } from "@/src/utils/formatDate";
import { SALIDA_MAQUILA_STATUS_CONFIG } from "../constants/salidaMaquilaStatus";
import type { SalidaMaquilaListItem } from "../interfaces/salida-maquila.interface";
import { salidaMaquilaFolio, salidaMaquilaOrigenRef } from "../constants/salidaMaquilaOrigen";
import { SalidaMaquilaOrigenLink } from "./SalidaMaquilaOrigenLink";

const columnHelper = createColumnHelper<SalidaMaquilaListItem>();

/** Total de la SM; sin la clave en la respuesta, "—" y al final al ordenar. */
const totalColumn = columnHelper.accessor((row) => (row.total == null ? undefined : Number(row.total)), {
  id: "total",
  header: "Total",
  size: 130,
  meta: { align: "right" },
  sortUndefined: "last",
  cell: (info) => (
    <span className="tabular-nums font-semibold">{formatAmountNoCurrency(info.getValue())}</span>
  ),
});

const baseColumns = (onView: (id: number) => void) =>
  [
    // `folio_display` ("SM-00012 · OR-00006") para pantalla y búsqueda.
    columnHelper.accessor((row) => salidaMaquilaFolio(row), {
      id: "folio",
      header: "Folio",
      size: 220,
      cell: ({ row }) => (
        <FolioActionMenu
          folio={salidaMaquilaFolio(row.original)}
          items={[{ label: "Ver detalle", icon: ViewIcon, onSelect: () => onView(row.original.id) }]}
          status={<StatusBadge status={row.original.estatus} config={SALIDA_MAQUILA_STATUS_CONFIG} />}
        />
      ),
    }),
    columnHelper.accessor((row) => salidaMaquilaOrigenRef(row)?.folio ?? "", {
      id: "origen",
      header: "Origen",
      size: 180,
      cell: ({ row }) => <SalidaMaquilaOrigenLink salida={row.original} />,
    }),
    columnHelper.accessor("centro_confeccion_nombre", {
      header: "Maquilero",
      size: 220,
      cell: (info) => (
        <span className="text-sm text-slate-700 dark:text-slate-200">{info.getValue() || "—"}</span>
      ),
    }),
    columnHelper.accessor("fecha_envio", {
      header: "Envío",
      size: 120,
      cell: (info) => <span className="text-sm tabular-nums">{formatShortCalendarDate(info.getValue())}</span>,
    }),
    columnHelper.accessor((row) => row.fecha_compromiso ?? "", {
      id: "fecha_compromiso",
      header: "Compromiso",
      size: 120,
      cell: (info) => (
        <span className="text-sm tabular-nums">{formatShortCalendarDate(info.getValue() || null)}</span>
      ),
    }),
    columnHelper.accessor((row) => Number(row.total_piezas), {
      id: "total_piezas",
      header: "Piezas",
      size: 100,
      meta: { align: "right" },
      cell: (info) => (
        <span className="flex flex-col items-end">
          <span className="tabular-nums">{formatQuantityValue(info.getValue())}</span>
          <SalidaMaquilaPiezas
            recibidas={info.row.original.piezas_recibidas}
            faltantes={info.row.original.piezas_faltantes}
            estatus={info.row.original.estatus}
          />
        </span>
      ),
    }),
    // Última recepción viva con que regresó (nucleo-erp #1239).
    columnHelper.accessor((row) => row.recepcion_folio ?? "", {
      id: "recepcion_folio",
      header: "Recepción",
      size: 120,
      cell: (info) => (
        <span className="font-mono text-sm text-slate-700 dark:text-slate-200">{info.getValue() || "—"}</span>
      ),
    }),
  ] as ColumnDef<SalidaMaquilaListItem>[];

/**
 * Columnas del listado de SM. El folio abre el menú; "Ver detalle" abre el diálogo.
 * Sin `R-PRODUCCION-COSTOS` (`canSeeAmounts`) no va la columna Total: el
 * backend omite el importe y una columna de guiones solo diría que existe.
 */
export const getSalidaMaquilaColumns = (onView: (id: number) => void, canSeeAmounts: boolean) =>
  [
    ...baseColumns(onView),
    ...(canSeeAmounts ? [totalColumn as ColumnDef<SalidaMaquilaListItem>] : []),
  ];
