"use client";

import Link from "next/link";
import { MainDialog } from "@/src/components/MainDialog";
import { EmptyLines, LineItemsTable } from "@/src/components/DetailDialogPrimitives";
import { StatusBadge } from "@/src/components/StatusBadge";
import { purchaseOrderStatusEntry } from "../constants/purchaseOrderStatus";
import { purchaseOrderDetailHref } from "../constants/purchaseOrderDetailOrigins";
import type { PurchaseOrderKpis } from "../interfaces/purchase-order-kpis.interface";
import { formatKpiDate, formatKpiMonto, plural } from "@/src/utils/kpiFormat";

/** Bloques con detalle: dos desgloses del propio payload y un drill-down. */
export type PurchaseOrderKpiDialogKind = "ocs_abiertas" | "ocs_vencidas_sin_recibir" | "gasto_por_categoria";

const FOLIO_LINK_CLASS =
  "font-mono font-medium text-slate-700 dark:text-slate-200 hover:text-sky-600 dark:hover:text-sky-400 hover:underline cursor-pointer";

const TH_CLASS = "px-3 py-2 font-semibold";
const TD_CLASS = "px-3 py-2 text-slate-600 dark:text-slate-300";

// Tope de filas que el backend devuelve en el drill-down de vencidas (sin paginación).
const DRILL_DOWN_BACKEND_LIMIT = 20;

/**
 * Descripción del diálogo: el CONTEO de lo que se muestra. Sin filas solo da el
 * total; el "Sin … para mostrar" lo dice el cuerpo (`EmptyLines`).
 */
function getDescription(
  kind: PurchaseOrderKpiDialogKind | null,
  data: PurchaseOrderKpis | undefined,
  showAmounts: boolean,
): string {
  // Sin importes visibles no se describe el gasto: ni siquiera cuántas
  // categorías hay (el cuerpo muestra un aviso neutro).
  if (kind === "gasto_por_categoria" && !showAmounts) return "Importes no disponibles.";
  if (kind === "ocs_abiertas" && data?.ocs_abiertas.disponible) {
    const { total } = data.ocs_abiertas;
    return `${total} ${plural(total, "OC abierta", "OCs abiertas")} por estatus`;
  }
  if (kind === "ocs_vencidas_sin_recibir" && data?.ocs_vencidas_sin_recibir.disponible) {
    const { drill_down, total } = data.ocs_vencidas_sin_recibir;
    const ocs = `${total} ${plural(total, "OC vencida", "OCs vencidas")}`;
    if (drill_down.length === 0) return ocs;
    // El backend corta la lista en 20, ordenada por entrega estimada ascendente.
    if (drill_down.length >= DRILL_DOWN_BACKEND_LIMIT && drill_down.length < total) {
      return `Mostrando las ${drill_down.length} más atrasadas de ${ocs}`;
    }
    return `Mostrando ${drill_down.length} de ${ocs}`;
  }
  if (kind === "gasto_por_categoria" && data?.gasto_por_categoria.disponible) {
    const { length } = data.gasto_por_categoria.categorias;
    return `${length} ${plural(length, "categoría", "categorías")}, de mayor a menor monto`;
  }
  return "Indicador no disponible por ahora.";
}

function OpenContent({ kpi, showAmounts }: { kpi: PurchaseOrderKpis["ocs_abiertas"]; showAmounts: boolean }) {
  if (!kpi.disponible || kpi.por_estatus.length === 0) {
    return <EmptyLines>Sin OCs abiertas para mostrar.</EmptyLines>;
  }
  // El backend no ordena `por_estatus`: se ordena por estatus (avance del ciclo).
  const rows = [...kpi.por_estatus].sort((a, b) => a.estatus - b.estatus);
  return (
    <LineItemsTable
      head={
        <>
          <th className={TH_CLASS}>Estatus</th>
          <th className={`${TH_CLASS} text-right`}>OCs</th>
          {showAmounts && <th className={`${TH_CLASS} text-right`}>Monto</th>}
        </>
      }
    >
      {rows.map((row) => (
        <tr key={row.estatus}>
          <td className={TD_CLASS}>
            <StatusBadge
              status={String(row.estatus)}
              config={{ [row.estatus]: purchaseOrderStatusEntry(row.estatus, row.estatus_label) }}
            />
          </td>
          <td className={`${TD_CLASS} text-right tabular-nums`}>{row.total}</td>
          {showAmounts && (
            <td className={`${TD_CLASS} text-right tabular-nums whitespace-nowrap`}>
              {row.monto === undefined ? "—" : formatKpiMonto(row.monto)}
            </td>
          )}
        </tr>
      ))}
    </LineItemsTable>
  );
}

function OverdueContent({ kpi }: { kpi: PurchaseOrderKpis["ocs_vencidas_sin_recibir"] }) {
  if (!kpi.disponible || kpi.drill_down.length === 0) {
    return <EmptyLines>Sin OCs vencidas para mostrar.</EmptyLines>;
  }
  return (
    <LineItemsTable
      head={
        <>
          <th className={TH_CLASS}>Folio OC</th>
          <th className={TH_CLASS}>Entrega estimada</th>
          <th className={`${TH_CLASS} text-right`}>Días vencida</th>
        </>
      }
    >
      {kpi.drill_down.map((oc) => (
        <tr key={oc.oc_id}>
          <td className={TD_CLASS}>
            {/* Sin `from`: el "Volver" del detalle regresa a esta lista. */}
            <Link href={purchaseOrderDetailHref(oc.oc_id)} className={FOLIO_LINK_CLASS} title="Ver detalle">
              {oc.folio || `#${oc.oc_id}`}
            </Link>
          </td>
          <td className={`${TD_CLASS} tabular-nums`}>{formatKpiDate(oc.fecha_entrega_estimada)}</td>
          <td className={`${TD_CLASS} tabular-nums text-right font-medium text-red-600 dark:text-red-400`}>
            {oc.dias_vencida}
          </td>
        </tr>
      ))}
    </LineItemsTable>
  );
}

function SpendContent({ kpi }: { kpi: PurchaseOrderKpis["gasto_por_categoria"] }) {
  if (!kpi.disponible || kpi.categorias.length === 0) {
    return <EmptyLines>Sin gasto por categoría para mostrar.</EmptyLines>;
  }
  return (
    <LineItemsTable
      head={
        <>
          <th className={TH_CLASS}>Categoría</th>
          <th className={`${TH_CLASS} text-right`}>Monto</th>
        </>
      }
    >
      {/* En el orden del backend (`-monto`). */}
      {kpi.categorias.map((row) => (
        <tr key={row.categoria}>
          <td className={TD_CLASS}>{row.categoria}</td>
          <td className={`${TD_CLASS} text-right tabular-nums whitespace-nowrap`}>
            {row.monto === undefined ? "—" : formatKpiMonto(row.monto)}
          </td>
        </tr>
      ))}
    </LineItemsTable>
  );
}

const TITLES: Record<PurchaseOrderKpiDialogKind, string> = {
  ocs_abiertas: "OCs abiertas por estatus",
  ocs_vencidas_sin_recibir: "OCs vencidas sin recibir",
  gasto_por_categoria: "Gasto por categoría",
};

interface PurchaseOrderKpiDialogProps {
  open: boolean;
  /**
   * ÚLTIMO bloque abierto (estado de la sección). Se conserva al cerrar, así
   * que el título y las filas siguen ahí durante la animación de salida;
   * `null` solo antes de la primera apertura.
   */
  kind: PurchaseOrderKpiDialogKind | null;
  data: PurchaseOrderKpis | undefined;
  /** Ver `getPurchaseOrderKpiAmountVisibility`. */
  showAmounts: boolean;
  onClose: () => void;
}

/**
 * Detalle de un indicador de OC, armado con el payload ya cargado (sin fetch
 * propio). Lee siempre los datos ACTUALES de la consulta, así que un refetch
 * con el diálogo abierto se refleja sin reabrirlo.
 */
export function PurchaseOrderKpiDialog({ open, kind, data, showAmounts, onClose }: PurchaseOrderKpiDialogProps) {
  return (
    <MainDialog
      open={open}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={kind ? TITLES[kind] : ""}
      description={getDescription(kind, data, showAmounts)}
      maxWidth="640px"
    >
      {kind === "ocs_abiertas" && data && <OpenContent kpi={data.ocs_abiertas} showAmounts={showAmounts} />}
      {kind === "ocs_vencidas_sin_recibir" && data && <OverdueContent kpi={data.ocs_vencidas_sin_recibir} />}
      {/* Sin importes visibles la tarjeta de gasto no ofrece el botón; esta rama
          cubre que la visibilidad cambie con el diálogo abierto (un refetch del
          listado): aviso neutro en vez de un cuerpo en blanco. */}
      {kind === "gasto_por_categoria" &&
        data &&
        (showAmounts ? (
          <SpendContent kpi={data.gasto_por_categoria} />
        ) : (
          <EmptyLines>No se pueden mostrar los importes del gasto por categoría.</EmptyLines>
        ))}
    </MainDialog>
  );
}
