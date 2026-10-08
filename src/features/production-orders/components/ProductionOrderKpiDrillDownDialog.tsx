"use client";

import Link from "next/link";
import { MainDialog } from "@/src/components/MainDialog";
import { EmptyLines, LineItemsTable } from "@/src/components/DetailDialogPrimitives";
import type { ProductionOrderKpis } from "../interfaces/production-order-kpis.interface";
import { formatKpiDate } from "../utils/productionOrderKpiFormat";

/** Bloques con drill-down. */
export type ProductionOrderKpiDrillDownKind = "cumplimiento_a_tiempo" | "ops_atrasadas";

const FOLIO_LINK_CLASS =
  "font-mono font-medium text-slate-700 dark:text-slate-200 hover:text-sky-600 dark:hover:text-sky-400 hover:underline cursor-pointer";

const TH_CLASS = "px-3 py-2 font-semibold";
const TD_CLASS = "px-3 py-2 text-slate-600 dark:text-slate-300";

/** Folio que navega al detalle de la OP (enlace real: abre en pestaña nueva con clic medio). */
function OpFolioLink({ opId, folio }: { opId: number; folio: string }) {
  return (
    <Link href={`/manufacturing/production-orders/${opId}`} className={FOLIO_LINK_CLASS} title="Ver detalle">
      {folio || `#${opId}`}
    </Link>
  );
}

// Tope de filas que el backend devuelve en cada drill-down (sin paginación).
const DRILL_DOWN_BACKEND_LIMIT = 20;

/**
 * "Mostrando X de N" (descripción del diálogo): el backend corta cada lista en
 * 20 filas y no hay endpoint para el resto, así que no hay "ver todas".
 *
 * Tardías: el backend no expone su total (`ops_terminadas - ops_a_tiempo`
 * incluye completadas sin fechas, que no son tardías), así que el total sale
 * de las filas. Con la lista llena puede haber más, y no se afirma un total.
 */
function getDescription(kind: ProductionOrderKpiDrillDownKind | null, data: ProductionOrderKpis | undefined): string {
  if (!kind || !data) return "Sin OPs para mostrar.";
  let shown = 0;
  let total = 0;
  if (kind === "cumplimiento_a_tiempo" && data.cumplimiento_a_tiempo.disponible) {
    shown = data.cumplimiento_a_tiempo.drill_down_tardias.length;
    if (shown >= DRILL_DOWN_BACKEND_LIMIT) return `Mostrando las ${DRILL_DOWN_BACKEND_LIMIT} más recientes`;
    total = shown;
  } else if (kind === "ops_atrasadas" && data.ops_atrasadas.disponible) {
    shown = data.ops_atrasadas.drill_down.length;
    total = data.ops_atrasadas.total;
  }
  if (shown === 0) return "Sin OPs para mostrar.";
  return `Mostrando ${shown} de ${total} OP${total === 1 ? "" : "s"}`;
}

function OnTimeContent({ kpi }: { kpi: ProductionOrderKpis["cumplimiento_a_tiempo"] }) {
  if (!kpi.disponible || kpi.drill_down_tardias.length === 0) {
    return <EmptyLines>Sin OPs tardías para mostrar.</EmptyLines>;
  }
  return (
    <LineItemsTable
      head={
        <>
          <th className={TH_CLASS}>Folio OP</th>
          <th className={TH_CLASS}>Entrega estimada</th>
          <th className={TH_CLASS}>Fecha fin</th>
        </>
      }
    >
      {kpi.drill_down_tardias.map((op) => (
        <tr key={op.op_id}>
          <td className={TD_CLASS}>
            <OpFolioLink opId={op.op_id} folio={op.folio_op} />
          </td>
          <td className={`${TD_CLASS} tabular-nums`}>{formatKpiDate(op.fecha_entrega_estimada)}</td>
          <td className={`${TD_CLASS} tabular-nums`}>{formatKpiDate(op.fecha_fin)}</td>
        </tr>
      ))}
    </LineItemsTable>
  );
}

function OverdueContent({ kpi }: { kpi: ProductionOrderKpis["ops_atrasadas"] }) {
  if (!kpi.disponible || kpi.drill_down.length === 0) {
    return <EmptyLines>Sin OPs atrasadas para mostrar.</EmptyLines>;
  }
  return (
    <LineItemsTable
      head={
        <>
          <th className={TH_CLASS}>Folio OP</th>
          <th className={TH_CLASS}>Entrega estimada</th>
          <th className={`${TH_CLASS} text-right`}>Días vencida</th>
        </>
      }
    >
      {kpi.drill_down.map((op) => (
        <tr key={op.op_id}>
          <td className={TD_CLASS}>
            <OpFolioLink opId={op.op_id} folio={op.folio_op} />
          </td>
          <td className={`${TD_CLASS} tabular-nums`}>{formatKpiDate(op.fecha_entrega_estimada)}</td>
          <td className={`${TD_CLASS} tabular-nums text-right font-medium text-red-600 dark:text-red-400`}>
            {op.dias_vencida}
          </td>
        </tr>
      ))}
    </LineItemsTable>
  );
}

const TITLES: Record<ProductionOrderKpiDrillDownKind, string> = {
  cumplimiento_a_tiempo: "OPs terminadas fuera de tiempo",
  ops_atrasadas: "OPs atrasadas",
};

interface ProductionOrderKpiDrillDownDialogProps {
  open: boolean;
  /**
   * ÚLTIMO bloque abierto (estado de la sección). Se conserva al cerrar, así
   * que el título y las filas siguen ahí durante la animación de salida;
   * `null` solo antes de la primera apertura.
   */
  kind: ProductionOrderKpiDrillDownKind | null;
  data: ProductionOrderKpis | undefined;
  onClose: () => void;
}

/**
 * Drill-down de un indicador: las filas que devolvió el backend, cada una con
 * enlace al detalle de la OP. Lee siempre los datos ACTUALES de la consulta, así
 * que un refetch con el diálogo abierto se refleja sin reabrirlo.
 */
export function ProductionOrderKpiDrillDownDialog({
  open,
  kind,
  data,
  onClose,
}: ProductionOrderKpiDrillDownDialogProps) {
  return (
    <MainDialog
      open={open}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={kind ? TITLES[kind] : ""}
      description={getDescription(kind, data)}
      maxWidth="640px"
    >
      {kind === "cumplimiento_a_tiempo" && data && <OnTimeContent kpi={data.cumplimiento_a_tiempo} />}
      {kind === "ops_atrasadas" && data && <OverdueContent kpi={data.ops_atrasadas} />}
    </MainDialog>
  );
}
