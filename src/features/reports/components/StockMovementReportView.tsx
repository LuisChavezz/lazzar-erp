"use client";

import { useState } from "react";
import { DataTable } from "@/src/components/DataTable";
import { StockMovementReportFilters } from "./StockMovementReportFilters";
import { StockMovementReportSummary } from "./StockMovementReportSummary";
import { getStockMovementReportColumns } from "./StockMovementReportColumns";
import { MOVEMENT_REPORT_VISTAS, type MovementReportVista } from "../constants/movementReportViews";
import { StockReportExportButtons } from "./StockReportExportButtons";
import { useStockMovementReport } from "@/src/features/stock/hooks/useStockMovementReport";
import { useStockMovementReportExport } from "@/src/features/stock/hooks/useStockReportExports";
import type { StockMovementReportTypeFilter } from "@/src/features/stock/interfaces/stock-movement-report.interface";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { useWarehousePreselection } from "../hooks/useWarehousePreselection";
import { movementDatePresetRange } from "../utils/movementDatePresets";

// Tamaño de página del endpoint (fijo). Alimenta el cálculo de páginas totales
// (`count / PAGE_SIZE`) que consume el pager de `DataTable`.
const PAGE_SIZE = 100;

/**
 * Flujo completo del Reporte de Movimientos: gate (tipo + rango de fechas,
 * almacén opcional) → resumen → tabla paginada en servidor → descarga en PDF o
 * Excel del conjunto completo (la genera el backend). Espejo estructural de `StockReportView`. Vive en su propia
 * ruta (`/system/reports/movimientos`).
 */
export function StockMovementReportView() {
  // Arranca en "Todos": al entrar ya se ve el mes completo.
  const [tipoMovimiento, setTipoMovimiento] =
    useState<StockMovementReportTypeFilter>("TODOS");
  const [busqueda, setBusqueda] = useState("");
  const [vista, setVista] = useState<MovementReportVista>("general");
  const [almacenId, setAlmacenId] = useState<number | null>(null);
  // Arranca en "Este mes": basta elegir el tipo para ver el reporte.
  const [[defaultInicio, defaultFinal]] = useState(() => movementDatePresetRange("mes"));
  const [fechaInicio, setFechaInicio] = useState<string | null>(defaultInicio);
  const [fechaFinal, setFechaFinal] = useState<string | null>(defaultFinal);
  // `page` se reinicia a 1 al cambiar cualquier filtro: un contexto de consulta
  // nuevo no debe reanudar en una página vieja.
  const [page, setPage] = useState(1);
  // Almacén de la sucursal del workspace, solo si es el único (ver el hook).
  // Un almacén nuevo es un contexto nuevo: vuelve a la página 1.
  const warehousePreselection = useWarehousePreselection(almacenId, (id) => {
    setAlmacenId(id);
    setPage(1);
  });

  // El almacén es OPCIONAL: NO forma parte del gate (a diferencia de existencias).
  const gateComplete = fechaInicio !== null && fechaFinal !== null;

  const { data, isLoading, isInitialError, isFetching, isPlaceholderData, error, refetch } =
    useStockMovementReport(
      gateComplete
        ? {
            tipo_movimiento: tipoMovimiento,
            fecha_inicio: fechaInicio,
            fecha_final: fechaFinal,
            almacen_id: almacenId ?? undefined,
            q: busqueda || undefined,
            page,
            page_size: PAGE_SIZE,
          }
        : null,
    );

  // Transición de CONTEXTO (tipo/almacén/fechas), no de página: con
  // `keepPreviousData` se sigue viendo la respuesta del contexto anterior
  // mientras llega la nueva. La respuesta echa el contexto al que pertenece, así
  // que detectamos cuando los datos mostrados ya no corresponden al contexto
  // elegido — a diferencia de un cambio de página, donde el `resumen` es idéntico
  // y no debe atenuarse. Se usa `?.` por si el backend omitiera `filtros`.
  const isStaleContext =
    isFetching &&
    data !== undefined &&
    (data.tipo_movimiento !== tipoMovimiento ||
      data.fecha_inicio !== fechaInicio ||
      data.fecha_final !== fechaFinal ||
      (data.filtros?.almacen_id ?? null) !== almacenId ||
      (data.filtros?.q ?? "") !== busqueda);

  const handleBusquedaChange = (q: string) => {
    setBusqueda(q);
    setPage(1);
  };

  const handleTipoChange = (tipo: StockMovementReportTypeFilter) => {
    setTipoMovimiento(tipo);
    setPage(1);
  };

  const handleAlmacenChange = (id: number | null) => {
    warehousePreselection.settle();
    setAlmacenId(id);
    setPage(1);
  };

  const handleDateRangeChange = (
    inicio: string | null,
    final: string | null,
  ) => {
    setFechaInicio(inicio);
    setFechaFinal(final);
    setPage(1);
  };

  // Descarga del reporte COMPLETO (todas las páginas del periodo), no la página
  // visible, generada por el backend con los filtros actuales. Sin almacén
  // ("Todos los almacenes") no viaja `almacen_id`, igual que en la consulta de
  // la pantalla. Los checks de null estrechan los tipos (equivalen a `gateComplete`).
  const reportExport = useStockMovementReportExport(
    fechaInicio !== null && fechaFinal !== null
      ? {
          tipo_movimiento: tipoMovimiento,
          fecha_inicio: fechaInicio,
          fecha_final: fechaFinal,
          almacen_id: almacenId ?? undefined,
          q: busqueda || undefined,
        }
      : null,
  );

  return (
    <div className="w-full space-y-8">

      <StockMovementReportFilters
        tipoMovimiento={tipoMovimiento}
        busqueda={busqueda}
        onBusquedaChange={handleBusquedaChange}
        almacenId={almacenId}
        fechaInicio={fechaInicio}
        fechaFinal={fechaFinal}
        onTipoChange={handleTipoChange}
        onAlmacenChange={handleAlmacenChange}
        onDateRangeChange={handleDateRangeChange}
      />

      {!gateComplete ? (
        <div className="rounded-lg border border-slate-200 px-6 py-10 text-center dark:border-white/10">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            Elige el periodo
          </p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Entradas, salidas, ajustes o transferencias del periodo, con su costo.
            El almacén es opcional.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* El resumen depende de `data` (campo NO paginado, sin un "vacío"
              natural que fabricar): solo se muestra una vez que llegó la
              primera respuesta buena, igual que antes. No se atenúa en un
              cambio de página; en un cambio de CONTEXTO los datos mostrados son
              aún del contexto anterior, por lo que se atenúa igual que la tabla
              hasta que llegue la respuesta nueva. */}
          {data && (
            <div
              className={
                isStaleContext
                  ? "blur-sm pointer-events-none select-none transition-[filter] duration-200"
                  : "transition-[filter] duration-200"
              }
            >
              <StockMovementReportSummary
                summary={data.resumen}
                tipoActivo={tipoMovimiento}
                onTipoChange={handleTipoChange}
              />
            </div>
          )}

          {/* `DataTable` se monta SIEMPRE (recibe `isLoading`/`isError` y
              alterna solo su cuerpo), así que su toolbar y `actionButton`
              ("PDF" / "Excel") siguen disponibles durante la carga o un
              error. `isInitialError` (de `useGuardedQuery`) solo es cierto
              si estos parámetros nunca cargaron: un refetch en segundo plano
              que falla conserva la última respuesta buena y avisa con un
              toast, en lugar de reemplazarla por la pantalla de error.
              Paginación de servidor: `data.results` ya es solo la página
              actual; `DataTable` no la recorta y cablea su pager a `setPage`. */}
          {/* Vista = qué columnas se ven al entrar. La tabla toma la
              visibilidad al montarse: `key` la remonta al cambiar de vista. */}
          <DataTable
            key={vista}
            columns={getStockMovementReportColumns(vista)}
            data={data?.results ?? []}
            emptyMessage={
              busqueda
                ? `Sin movimientos que coincidan con "${busqueda}" en el periodo.`
                : "No se encontraron movimientos para el tipo, almacén y periodo seleccionados."
            }
            actionButton={
              <div className="flex flex-wrap items-center gap-3">
                <div
                  role="radiogroup"
                  aria-label="Vista de columnas"
                  className="inline-flex divide-x divide-slate-200 overflow-hidden rounded-lg border border-slate-200 dark:divide-white/10 dark:border-white/10"
                >
                  {MOVEMENT_REPORT_VISTAS.map((v) => (
                    <button
                      key={v.key}
                      type="button"
                      role="radio"
                      aria-checked={vista === v.key}
                      title={v.hint}
                      onClick={() => setVista(v.key)}
                      className={`h-9 cursor-pointer px-3 text-xs font-semibold transition-colors focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500/60 ${
                        vista === v.key
                          ? "bg-accent text-accent-foreground"
                          : "bg-white text-slate-600 hover:bg-slate-50 dark:bg-transparent dark:text-slate-300 dark:hover:bg-white/[0.04]"
                      }`}
                    >
                      {v.label}
                    </button>
                  ))}
                </div>
                <StockReportExportButtons
                  isExporting={reportExport.isExporting}
                  onExport={reportExport.exportReport}
                />
              </div>
            }
            serverPagination={{
              pageCount: Math.max(1, Math.ceil((data?.count ?? 0) / PAGE_SIZE)),
              currentPage: page,
              onPageChange: setPage,
              // Solo se deshabilita en una TRANSICIÓN (cambio de página o de
              // contexto), no en un refetch manual en el sitio.
              isFetching: isPlaceholderData,
            }}
            isLoadingOverlay={isPlaceholderData}
            loadingTitle={
              isStaleContext ? "Actualizando reporte" : "Actualizando página"
            }
            loadingMessage={
              isStaleContext
                ? "Cargando los movimientos del contexto seleccionado."
                : "Cargando el siguiente conjunto de resultados."
            }
            onRefetch={() => refetch()}
            isRefetching={isFetching}
            isLoading={isLoading}
            isError={isInitialError}
            errorTitle="Error al generar el reporte"
            errorMessage={extractErrorMessage(error, "No se pudo generar el reporte.")}
            loadingAriaLabel="Generando reporte"
          />
        </div>
      )}
    </div>
  );
}
