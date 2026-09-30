"use client";

import { createColumnHelper, type ColumnDef } from "@tanstack/react-table";
import { StatusBadge } from "@/src/components/StatusBadge";
import { textOrDash } from "@/src/components/DetailDialogPrimitives";
import { formatLocalDate } from "@/src/utils/formatDate";
import { QUALITY_TIPO_ORIGEN_CFG } from "../constants/qualityResultado";
import type { QualityPendingReception } from "../interfaces/quality-inspection.interface";

const columnHelper = createColumnHelper<QualityPendingReception>();

interface QualityInspectionColumnsCallbacks {
  /** Debe ser estable (p. ej. el setter de un `useState`): ver `row-actions`. */
  onInspect: (reception: QualityPendingReception) => void;
}

/**
 * Sin columna de almacén: el onboarding solo trae `almacen_id` y resolver el
 * nombre exigiría otra petición. El almacén se muestra en el diálogo, que sí
 * carga el detalle de la recepción.
 */
export const getQualityInspectionColumns = ({
  onInspect,
}: QualityInspectionColumnsCallbacks) =>
  [
    columnHelper.accessor("folio", {
      header: "Folio",
      cell: ({ row, getValue }) => (
        <button
          type="button"
          onClick={() => onInspect(row.original)}
          title="Inspeccionar"
          className="font-mono font-semibold text-slate-700 dark:text-slate-200 hover:text-sky-600 dark:hover:text-sky-400 hover:underline cursor-pointer"
        >
          {getValue()}
        </button>
      ),
    }),
    columnHelper.accessor("tipo_origen", {
      header: "Tipo de Recepción",
      cell: (info) => (
        <StatusBadge status={info.getValue()} config={QUALITY_TIPO_ORIGEN_CFG} />
      ),
    }),
    // `null` → "" por el mismo motivo que en `ReceiptColumns`: las recepciones
    // de OP no tienen proveedor y el filtro global falla con valores nulos.
    columnHelper.accessor((row) => row.proveedor_nombre ?? "", {
      id: "proveedor_nombre",
      header: "Proveedor",
      cell: (info) => (
        <span className="text-slate-600 dark:text-slate-300">{textOrDash(info.getValue())}</span>
      ),
    }),
    columnHelper.accessor("fecha_recepcion", {
      header: "Fecha Recepción",
      cell: (info) => (
        <span className="text-slate-600 dark:text-slate-300 tabular-nums">
          {formatLocalDate(info.getValue())}
        </span>
      ),
    }),
    columnHelper.accessor((row) => row.detalle.length, {
      id: "renglones",
      header: "Renglones",
      meta: { align: "right" },
      cell: (info) => (
        <span className="text-slate-600 dark:text-slate-300 tabular-nums">{info.getValue()}</span>
      ),
    }),
    columnHelper.display({
      id: "actions",
      header: "Acciones",
      meta: { align: "center" },
      cell: ({ row }) => (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => onInspect(row.original)}
            className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:hover:bg-emerald-500/20 cursor-pointer transition-colors"
          >
            Inspeccionar
          </button>
        </div>
      ),
    }),
  ] as ColumnDef<QualityPendingReception>[];
