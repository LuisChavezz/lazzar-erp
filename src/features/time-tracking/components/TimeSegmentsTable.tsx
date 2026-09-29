"use client";

import { ActionMenu, type ActionMenuItem } from "@/src/components/ActionMenu";
import { LineItemsTable } from "@/src/components/DetailDialogPrimitives";
import { DeleteIcon, EditIcon } from "@/src/components/Icons";
import { StatusBadge } from "@/src/components/StatusBadge";
import { getMexicoTimeHHMM } from "@/src/utils/mexicoTime";
import type { ProductionOrderListItem } from "@/src/features/production-orders/interfaces/production-order.interface";
import {
  SEGMENT_ISSUE_LABELS,
  TIPO_CONTROL_HORAS_CFG,
  type SegmentIssue,
} from "../constants/timeTrackingChoices";
import type { TimeSegment } from "../interfaces/time-tracking.interface";
import { decimalToHundredths, formatHundredths } from "../utils/hours";
import { getOpLabel, SIN_OP_LABEL } from "../utils/productionOrderOptions";

interface TimeSegmentsTableProps {
  segments: readonly TimeSegment[];
  issuesById: Map<number, SegmentIssue[]>;
  orderById: Map<number, ProductionOrderListItem>;
  ordersLoaded: boolean;
  /** Tramo en edición (se resalta), o `null`. */
  editingId: number | null;
  canEdit: boolean;
  canDelete: boolean;
  /** Escritura en vuelo: las acciones se deshabilitan. */
  busy: boolean;
  onEdit: (segment: TimeSegment) => void;
  onDelete: (segment: TimeSegment) => void;
}

const HEAD_CELL = "px-3 py-2 font-medium";
const CELL = "px-3 py-2 align-top";

/** Horas del servidor ("2.50 h"), o "—" en un tramo abierto o sin valor. */
const formatHoras = (segment: TimeSegment): string => {
  if (segment.hora_fin === null) return "—";
  const hundredths = decimalToHundredths(segment.horas_trabajadas);
  return hundredths !== null ? `${formatHundredths(hundredths)} h` : "—";
};

/**
 * Tabla de tramos de una asistencia. Un listado corto dentro de un diálogo:
 * `LineItemsTable` (chrome) y no `DataTable`. Las inconsistencias se SEÑALAN
 * bajo el horario; nunca se corrigen solas.
 */
export function TimeSegmentsTable({
  segments,
  issuesById,
  orderById,
  ordersLoaded,
  editingId,
  canEdit,
  canDelete,
  busy,
  onEdit,
  onDelete,
}: TimeSegmentsTableProps) {
  const hasActions = canEdit || canDelete;

  return (
    <LineItemsTable
      head={
        <>
          <th className={HEAD_CELL}>Horario</th>
          <th className={`${HEAD_CELL} text-right`}>Horas</th>
          <th className={HEAD_CELL}>Tipo</th>
          <th className={HEAD_CELL}>OP</th>
          <th className={HEAD_CELL}>Descripción</th>
          {hasActions && <th className={`${HEAD_CELL} text-center`}>Acciones</th>}
        </>
      }
    >
      {segments.map((segment) => {
        const issues = issuesById.get(segment.id) ?? [];
        const items: ActionMenuItem[] = [];
        if (canEdit) {
          items.push({
            label: "Editar",
            icon: EditIcon,
            onSelect: () => onEdit(segment),
            disabled: busy || editingId === segment.id,
          });
        }
        if (canDelete) {
          items.push({
            label: "Eliminar",
            icon: DeleteIcon,
            onSelect: () => onDelete(segment),
            // El tramo en edición se elimina después de cancelar su edición.
            disabled: busy || editingId === segment.id,
          });
        }
        return (
          <tr
            key={segment.id}
            className={editingId === segment.id ? "bg-sky-50/70 dark:bg-sky-500/10" : undefined}
          >
            <td className={`${CELL} whitespace-nowrap`}>
              <span className="tabular-nums text-slate-700 dark:text-slate-200">
                {getMexicoTimeHHMM(segment.hora_inicio) || "—"}–
                {getMexicoTimeHHMM(segment.hora_fin) || "…"}
              </span>
              {issues.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1">
                  {issues.map((issue) => (
                    <span
                      key={issue}
                      className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-500/10 dark:text-amber-400"
                    >
                      {SEGMENT_ISSUE_LABELS[issue]}
                    </span>
                  ))}
                </div>
              )}
            </td>
            <td className={`${CELL} text-right tabular-nums text-slate-600 dark:text-slate-300`}>
              {formatHoras(segment)}
            </td>
            <td className={CELL}>
              <StatusBadge status={segment.tipo} config={TIPO_CONTROL_HORAS_CFG} />
            </td>
            <td className={`${CELL} whitespace-nowrap text-slate-600 dark:text-slate-300`}>
              {segment.op !== null ? getOpLabel(segment.op, orderById, ordersLoaded) : SIN_OP_LABEL}
            </td>
            <td className={CELL}>
              <span
                className="block max-w-56 truncate text-slate-500 dark:text-slate-400"
                title={segment.descripcion || undefined}
              >
                {segment.descripcion?.trim() || "—"}
              </span>
            </td>
            {hasActions && (
              <td className={CELL}>
                <div className="flex justify-center">
                  <ActionMenu items={items} ariaLabel="Acciones del tramo" />
                </div>
              </td>
            )}
          </tr>
        );
      })}
    </LineItemsTable>
  );
}
