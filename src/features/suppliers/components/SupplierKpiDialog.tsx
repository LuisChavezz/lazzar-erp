"use client";

import Link from "next/link";
import { MainDialog } from "@/src/components/MainDialog";
import { EmptyLines, LineItemsTable } from "@/src/components/DetailDialogPrimitives";
import { StatusBadge, type StatusBadgeConfigEntry } from "@/src/components/StatusBadge";
import { formatQuantityValue } from "@/src/utils/formatCurrency";
import { formatKpiDias, formatKpiPct, plural } from "@/src/utils/kpiFormat";
import type { SupplierKpiRow, SupplierKpis, SupplierKpiSemaforo } from "../interfaces/supplier-kpis.interface";
import { supplierDetailHref } from "../utils/supplierPurchaseOrderHistoryFilters";
import { useSuppliers } from "../hooks/useSuppliers";
import { getSupplierKpiTruncationNote } from "../utils/supplierKpis";

/** Tarjetas con drill-down. */
export type SupplierKpiDialogKind = "entrega_a_tiempo" | "calidad" | "lead_time" | "scorecard";

const NAME_LINK_CLASS =
  "font-medium text-slate-700 dark:text-slate-200 hover:text-sky-600 dark:hover:text-sky-400 hover:underline cursor-pointer";

const TH_CLASS = "px-3 py-2 font-semibold";
const TD_CLASS = "px-3 py-2 text-slate-600 dark:text-slate-300";
const NUM_TD_CLASS = `${TD_CLASS} text-right tabular-nums whitespace-nowrap`;

// Las filas con la métrica de la tarjeta en `null` no aportan nada al
// indicador: se excluyen. Orden: el peor primero; empates por nombre.
const byName = (a: SupplierKpiRow, b: SupplierKpiRow) => a.proveedor_nombre.localeCompare(b.proveedor_nombre, "es");

function getRows(kind: SupplierKpiDialogKind, rows: SupplierKpiRow[]): SupplierKpiRow[] {
  switch (kind) {
    case "entrega_a_tiempo":
      // `pct` es `null` sin recepciones con fecha prometida: no aportan.
      return rows
        .filter((row) => row.entrega_a_tiempo.pct !== null)
        .sort((a, b) => (a.entrega_a_tiempo.pct ?? 0) - (b.entrega_a_tiempo.pct ?? 0) || byName(a, b));
    case "calidad":
      return rows
        .filter((row) => row.calidad.pct_rechazado !== null)
        .sort((a, b) => (b.calidad.pct_rechazado ?? 0) - (a.calidad.pct_rechazado ?? 0) || byName(a, b));
    case "lead_time":
      return rows
        .filter((row) => row.lead_time.dias_promedio_real !== null)
        .sort(
          (a, b) =>
            (b.lead_time.dias_promedio_real ?? 0) - (a.lead_time.dias_promedio_real ?? 0) || byName(a, b),
        );
    case "scorecard":
      // `puntaje` es `null` sin ningún factor con dato (`sin_datos`).
      return rows
        .filter((row) => row.scorecard.puntaje !== null)
        .sort((a, b) => (a.scorecard.puntaje ?? 0) - (b.scorecard.puntaje ?? 0) || byName(a, b));
  }
}

/**
 * Proveedor como enlace real a su detalle, solo si está en el listado activo
 * (`["suppliers"]`, el mismo que carga la tabla de esta página): el payload
 * no filtra bajas, y el detalle de un proveedor dado de baja responde 404.
 * Mientras el listado no ha cargado, el nombre va en texto plano.
 */
function SupplierCell({ row, linkable }: { row: SupplierKpiRow; linkable: boolean }) {
  const name = row.proveedor_nombre || `#${row.proveedor_id}`;
  return (
    <td className={TD_CLASS}>
      {linkable ? (
        <Link href={supplierDetailHref(row.proveedor_id)} className={NAME_LINK_CLASS} title="Ver detalle">
          {name}
        </Link>
      ) : (
        <span className="font-medium text-slate-700 dark:text-slate-200">{name}</span>
      )}
    </td>
  );
}

function OnTimeTable({ rows, activeIds }: { rows: SupplierKpiRow[]; activeIds: Set<number> }) {
  return (
    <LineItemsTable
      head={
        <>
          <th className={TH_CLASS}>Proveedor</th>
          <th className={`${TH_CLASS} text-right`}>A tiempo</th>
          <th className={`${TH_CLASS} text-right`}>Con fecha prometida</th>
          <th className={`${TH_CLASS} text-right`}>% a tiempo</th>
        </>
      }
    >
      {rows.map((row) => (
        <tr key={row.proveedor_id}>
          <SupplierCell row={row} linkable={activeIds.has(row.proveedor_id)} />
          <td className={NUM_TD_CLASS}>{formatQuantityValue(row.entrega_a_tiempo.recepciones_a_tiempo)}</td>
          <td className={NUM_TD_CLASS}>{formatQuantityValue(row.entrega_a_tiempo.recepciones_con_compromiso)}</td>
          <td className={NUM_TD_CLASS}>{formatKpiPct(row.entrega_a_tiempo.pct ?? 0)}</td>
        </tr>
      ))}
    </LineItemsTable>
  );
}

function QualityTable({ rows, activeIds }: { rows: SupplierKpiRow[]; activeIds: Set<number> }) {
  return (
    <LineItemsTable
      head={
        <>
          <th className={TH_CLASS}>Proveedor</th>
          <th className={`${TH_CLASS} text-right`}>Rechazada</th>
          <th className={`${TH_CLASS} text-right`}>Inspeccionada</th>
          <th className={`${TH_CLASS} text-right`}>% rechazado</th>
        </>
      }
    >
      {rows.map((row) => (
        <tr key={row.proveedor_id}>
          <SupplierCell row={row} linkable={activeIds.has(row.proveedor_id)} />
          <td className={NUM_TD_CLASS}>{formatQuantityValue(row.calidad.cantidad_rechazada)}</td>
          <td className={NUM_TD_CLASS}>{formatQuantityValue(row.calidad.cantidad_inspeccionada)}</td>
          <td className={NUM_TD_CLASS}>{formatKpiPct(row.calidad.pct_rechazado ?? 0)}</td>
        </tr>
      ))}
    </LineItemsTable>
  );
}

function LeadTimeTable({ rows, activeIds }: { rows: SupplierKpiRow[]; activeIds: Set<number> }) {
  return (
    <LineItemsTable
      head={
        <>
          <th className={TH_CLASS}>Proveedor</th>
          <th className={`${TH_CLASS} text-right`}>Días reales</th>
          <th className={`${TH_CLASS} text-right`}>Días pactados</th>
        </>
      }
    >
      {rows.map((row) => (
        <tr key={row.proveedor_id}>
          <SupplierCell row={row} linkable={activeIds.has(row.proveedor_id)} />
          <td className={NUM_TD_CLASS}>{formatKpiDias(row.lead_time.dias_promedio_real)}</td>
          <td className={NUM_TD_CLASS}>{formatKpiDias(row.lead_time.dias_promedio_pactado)}</td>
        </tr>
      ))}
    </LineItemsTable>
  );
}

const SEMAFORO_CONFIG: Record<Exclude<SupplierKpiSemaforo, "sin_datos">, StatusBadgeConfigEntry> = {
  verde: {
    label: "Verde",
    cls: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
    dot: "bg-emerald-500",
  },
  amarillo: {
    label: "Amarillo",
    cls: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
    dot: "bg-amber-500",
  },
  rojo: {
    label: "Rojo",
    cls: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400",
    dot: "bg-rose-500",
  },
};

const PUNTAJE_FORMAT = new Intl.NumberFormat("es-MX", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/**
 * Ranking por puntaje. El nombre abre el detalle por factor del proveedor
 * (diálogo de la sección), así que es un botón y no el enlace a su ficha.
 */
function ScorecardTable({
  rows,
  onOpenSupplier,
}: {
  rows: SupplierKpiRow[];
  onOpenSupplier: (row: SupplierKpiRow) => void;
}) {
  return (
    <LineItemsTable
      head={
        <>
          <th className={TH_CLASS}>Proveedor</th>
          <th className={`${TH_CLASS} text-right`}>Puntaje</th>
          <th className={`${TH_CLASS} text-center`}>Semáforo</th>
        </>
      }
    >
      {rows.map((row) => (
        <tr key={row.proveedor_id}>
          <td className={TD_CLASS}>
            <button
              type="button"
              className={`${NAME_LINK_CLASS} text-left`}
              title="Ver detalle"
              onClick={() => onOpenSupplier(row)}
            >
              {row.proveedor_nombre || `#${row.proveedor_id}`}
            </button>
          </td>
          <td className={NUM_TD_CLASS}>{PUNTAJE_FORMAT.format(row.scorecard.puntaje ?? 0)}</td>
          <td className={`${TD_CLASS} text-center`}>
            <StatusBadge status={row.scorecard.semaforo} config={SEMAFORO_CONFIG} />
          </td>
        </tr>
      ))}
    </LineItemsTable>
  );
}

const TITLES: Record<SupplierKpiDialogKind, string> = {
  entrega_a_tiempo: "Entrega a tiempo por proveedor",
  calidad: "Calidad por proveedor",
  lead_time: "Lead time por proveedor",
  scorecard: "Scorecard por proveedor",
};

const EMPTY_TEXT: Record<SupplierKpiDialogKind, string> = {
  entrega_a_tiempo: "No hay proveedores con recepciones para mostrar.",
  calidad: "No hay proveedores con material inspeccionado para mostrar.",
  lead_time: "No hay proveedores con lead time para mostrar.",
  scorecard: "No hay proveedores evaluados para mostrar.",
};

interface SupplierKpiDialogProps {
  open: boolean;
  /**
   * ÚLTIMA tarjeta abierta (estado de la sección). Se conserva al cerrar, así
   * que el título y las filas siguen ahí durante la animación de salida;
   * `null` solo antes de la primera apertura.
   */
  kind: SupplierKpiDialogKind | null;
  data: SupplierKpis | undefined;
  onClose: () => void;
  /** Abre el detalle por factor de un proveedor del ranking del Scorecard. */
  onOpenSupplier: (row: SupplierKpiRow) => void;
}

/**
 * Drill-down por proveedor de una tarjeta, armado con el payload ya cargado
 * (sin fetch propio): solo las columnas de ESA tarjeta. El del Scorecard lista
 * puntaje y semáforo; cada proveedor abre su detalle por factor
 * (`SupplierKpiDetailDialog`, con su propia consulta).
 */
export function SupplierKpiDialog({ open, kind, data, onClose, onOpenSupplier }: SupplierKpiDialogProps) {
  const { suppliers } = useSuppliers();
  const activeIds = new Set(suppliers.map((supplier) => supplier.id));
  const rows = kind && data ? getRows(kind, data.proveedores) : [];
  const shown = `${rows.length} ${plural(rows.length, "proveedor", "proveedores")}, el peor primero`;
  // Con el ranking cortado (`truncado`), el desglose cubre las mismas filas que
  // la tarjeta: lo dice con `total_proveedores`.
  const truncationNote = data ? getSupplierKpiTruncationNote(data) : null;
  const description =
    rows.length === 0 ? "Sin proveedores que mostrar" : truncationNote ? `${shown}. ${truncationNote}` : shown;
  return (
    <MainDialog
      open={open}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={kind ? TITLES[kind] : ""}
      description={description}
      maxWidth="760px"
    >
      {kind && rows.length === 0 && <EmptyLines>{EMPTY_TEXT[kind]}</EmptyLines>}
      {kind === "entrega_a_tiempo" && rows.length > 0 && <OnTimeTable rows={rows} activeIds={activeIds} />}
      {kind === "calidad" && rows.length > 0 && <QualityTable rows={rows} activeIds={activeIds} />}
      {kind === "lead_time" && rows.length > 0 && <LeadTimeTable rows={rows} activeIds={activeIds} />}
      {kind === "scorecard" && rows.length > 0 && <ScorecardTable rows={rows} onOpenSupplier={onOpenSupplier} />}
    </MainDialog>
  );
}
