"use client";

import { useEffect, useState } from "react";
import { COMPACT_FIELD_CLS } from "@/src/constants/formStyles";
// Se reutiliza el MISMO selector de almacén de existencias (StockView) en vez
// de duplicarlo: solo depende de `useWarehouses` y ya lista únicamente
// almacenes activos, ordenados alfabéticamente, con el estilo del proyecto.
import { WarehouseFilter } from "@/src/features/stock/components/WarehouseFilter";
import { STOCK_MOVEMENT_REPORT_TYPE_CONFIG } from "@/src/features/stock/constants/stockMovementReportTypes";
import { REPORT_FIELD_LABEL_CLS, REPORT_TEXT_INPUT_CLS } from "../constants/reportFieldStyles";
import { ReportDateRangeFields } from "./ReportDateRangeFields";
import type {
  StockMovementReportType,
  StockMovementReportTypeFilter,
} from "@/src/features/stock/interfaces/stock-movement-report.interface";

interface StockMovementReportFiltersProps {
  /** Tipo de movimiento, o `TODOS`. */
  tipoMovimiento: StockMovementReportTypeFilter;
  /** Búsqueda confirmada (SKU, producto o folio). */
  busqueda: string;
  onBusquedaChange: (q: string) => void;
  /** Almacén seleccionado, o `null` (OPCIONAL en este reporte). */
  almacenId: number | null;
  /** Inicio del rango (`YYYY-MM-DD`), o `null`. */
  fechaInicio: string | null;
  /** Fin del rango (`YYYY-MM-DD`), o `null`. */
  fechaFinal: string | null;
  onTipoChange: (tipo: StockMovementReportTypeFilter) => void;
  onAlmacenChange: (almacenId: number | null) => void;
  onDateRangeChange: (
    fechaInicio: string | null,
    fechaFinal: string | null,
  ) => void;
}

/**
 * Barra de filtros (gate) del reporte de movimientos por periodo.
 *
 * Componente controlado: el estado vive en el contenedor. La consulta se
 * dispara con el periodo completo; el tipo arranca en `TODOS`, y el almacén y
 * la búsqueda son opcionales (sin ellos ⇒ todo).
 */
export function StockMovementReportFilters({
  tipoMovimiento,
  busqueda,
  onBusquedaChange,
  almacenId,
  fechaInicio,
  fechaFinal,
  onTipoChange,
  onAlmacenChange,
  onDateRangeChange,
}: StockMovementReportFiltersProps) {
  // Texto que se escribe; se confirma solo tras una pausa (o Enter) para no
  // consultar con cada tecla.
  const [texto, setTexto] = useState(busqueda);
  useEffect(() => {
    const t = window.setTimeout(() => {
      if (texto.trim() !== busqueda) onBusquedaChange(texto.trim());
    }, 400);
    return () => window.clearTimeout(t);
  }, [texto, busqueda, onBusquedaChange]);

  const segmento = (activo: boolean) =>
    `inline-flex h-9 cursor-pointer items-center gap-2 px-4 text-sm font-semibold transition-colors focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500/60 ${
      activo
        ? "bg-accent text-accent-foreground"
        : "bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:bg-transparent dark:text-slate-300 dark:hover:bg-white/[0.04] dark:hover:text-white"
    }`;

  // Encabezado de la hoja: sin tarjeta; una línea lo separa de los totales.
  return (
    <div className="space-y-5 border-b border-slate-200 pb-6 dark:border-white/10">
      <div>
        <span className={REPORT_FIELD_LABEL_CLS}>Tipo de movimiento</span>
        <div
          role="radiogroup"
          aria-label="Tipo de movimiento"
          className="inline-flex max-w-full flex-wrap divide-x divide-slate-200 overflow-hidden rounded-lg border border-slate-200 dark:divide-white/10 dark:border-white/10"
        >
          <button
            type="button"
            role="radio"
            aria-checked={tipoMovimiento === "TODOS"}
            onClick={() => onTipoChange("TODOS")}
            className={segmento(tipoMovimiento === "TODOS")}
          >
            Todos
          </button>
          {Object.entries(STOCK_MOVEMENT_REPORT_TYPE_CONFIG).map(([value, cfg]) => {
            const activo = tipoMovimiento === value;
            return (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={activo}
                onClick={() => onTipoChange(value as StockMovementReportType)}
                className={segmento(activo)}
              >
                <span
                  className={`h-2 w-2 rounded-full ${cfg.dot} ${activo ? "ring-2 ring-white/80" : ""}`}
                  aria-hidden="true"
                />
                {cfg.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <label className="group/field block w-56">
          <span className={REPORT_FIELD_LABEL_CLS}>
            Buscar
          </span>
          <input
            type="search"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onBusquedaChange(texto.trim());
            }}
            placeholder="SKU, producto o folio"
            className={REPORT_TEXT_INPUT_CLS}
          />
        </label>

        {/* Almacén: OPCIONAL. Sin selección ⇒ el reporte incluye todos. */}
        <WarehouseFilter
          value={almacenId}
          onChange={onAlmacenChange}
          allowClear
          className={COMPACT_FIELD_CLS}
        />

        <ReportDateRangeFields
          fechaInicio={fechaInicio}
          fechaFinal={fechaFinal}
          onChange={onDateRangeChange}
        />
      </div>
    </div>
  );
}
