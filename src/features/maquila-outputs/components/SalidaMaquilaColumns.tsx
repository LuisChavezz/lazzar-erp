"use client";

import { createColumnHelper, type ColumnDef } from "@tanstack/react-table";
import { FolioActionMenu } from "@/src/components/FolioActionMenu";
import { ViewIcon } from "@/src/components/Icons";
import { StatusBadge } from "@/src/components/StatusBadge";
import { formatAmountNoCurrency, formatQuantityValue } from "@/src/utils/formatCurrency";
import { formatShortCalendarDate } from "@/src/utils/formatDate";
import { SALIDA_MAQUILA_STATUS_CONFIG } from "../constants/salidaMaquilaStatus";
import type { SalidaMaquilaListItem } from "../interfaces/salida-maquila.interface";
import { SalidaMaquilaOrigenLink } from "./SalidaMaquilaOrigenLink";

const columnHelper = createColumnHelper<SalidaMaquilaListItem>();

/** Columnas del listado de SM. El folio abre el menú; "Ver detalle" abre el diálogo. */
export const getSalidaMaquilaColumns = (onView: (id: number) => void) =>
  [
    columnHelper.accessor("folio", {
      header: "Folio",
      size: 170,
      cell: ({ row }) => (
        <FolioActionMenu
          folio={row.original.folio}
          items={[{ label: "Ver detalle", icon: ViewIcon, onSelect: () => onView(row.original.id) }]}
          status={<StatusBadge status={row.original.estatus} config={SALIDA_MAQUILA_STATUS_CONFIG} />}
        />
      ),
    }),
    columnHelper.accessor((row) => row.origen_folio ?? row.op_folio ?? row.ob_folio ?? "", {
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
      cell: (info) => <span className="tabular-nums">{formatQuantityValue(info.getValue())}</span>,
    }),
    columnHelper.accessor((row) => Number(row.total), {
      id: "total",
      header: "Total",
      size: 130,
      meta: { align: "right" },
      cell: (info) => (
        <span className="tabular-nums font-semibold">{formatAmountNoCurrency(info.getValue())}</span>
      ),
    }),
  ] as ColumnDef<SalidaMaquilaListItem>[];
