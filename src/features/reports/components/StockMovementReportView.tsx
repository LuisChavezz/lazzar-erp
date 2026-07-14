"use client";

import { useState } from "react";
import { Loader } from "@/src/components/Loader";
import { ErrorState } from "@/src/components/ErrorState";
import { DataTable } from "@/src/components/DataTable";
import { Button } from "@/src/components/Button";
import { ArrowLeftIcon, DownloadIcon } from "@/src/components/Icons";
import { StockMovementReportFilters } from "./StockMovementReportFilters";
import { StockMovementReportSummary } from "./StockMovementReportSummary";
import { stockMovementReportColumns } from "./StockMovementReportColumns";
import { useStockMovementReport } from "@/src/features/stock/hooks/useStockMovementReport";
import { useExportStockMovementReportPdf } from "@/src/features/stock/hooks/useExportStockMovementReportPdf";
import type { StockMovementReportType } from "@/src/features/stock/interfaces/stock-movement-report.interface";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";

// Tamaño de página del endpoint (fijo). Alimenta el cálculo de páginas totales
// (`count / PAGE_SIZE`) que consume el pager de `DataTable`.
const PAGE_SIZE = 100;

interface StockMovementReportViewProps {
  /** Vuelve al menú de reportes (reinicia `selectedReport` en la página). */
  onBack: () => void;
}

/**
 * Flujo completo del Reporte de Movimientos: gate (tipo + rango de fechas,
 * almacén opcional) → resumen → tabla paginada en servidor → exportación PDF del
 * conjunto completo. Espejo estructural del flujo de existencias que vive en
 * `page.tsx`, extraído aquí como componente autónomo para (a) mantener el diff
 * de `page.tsx` mínimo y aditivo y (b) que el estado del gate se reinicie solo
 * al desmontar/volver a montar (volver al selector limpia todo sin trabajo extra).
 */
export function StockMovementReportView({ onBack }: StockMovementReportViewProps) {
  const [tipoMovimiento, setTipoMovimiento] =
    useState<StockMovementReportType | null>(null);
  const [almacenId, setAlmacenId] = useState<number | null>(null);
  const [fechaInicio, setFechaInicio] = useState<string | null>(null);
  const [fechaFinal, setFechaFinal] = useState<string | null>(null);
  // `page` se reinicia a 1 al cambiar cualquier filtro: un contexto de consulta
  // nuevo no debe reanudar en una página vieja.
  const [page, setPage] = useState(1);

  // El almacén es OPCIONAL: NO forma parte del gate (a diferencia de existencias).
  const gateComplete =
    tipoMovimiento !== null && fechaInicio !== null && fechaFinal !== null;

  const { data, isLoading, isFetching, isPlaceholderData, error, refetch } =
    useStockMovementReport(
      gateComplete
        ? {
            tipo_movimiento: tipoMovimiento,
            fecha_inicio: fechaInicio,
            fecha_final: fechaFinal,
            almacen_id: almacenId ?? undefined,
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
      (data.filtros?.almacen_id ?? null) !== almacenId);

  const handleTipoChange = (tipo: StockMovementReportType | null) => {
    setTipoMovimiento(tipo);
    setPage(1);
  };

  const handleAlmacenChange = (id: number | null) => {
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

  // Exportación a PDF del reporte COMPLETO (todas las páginas del periodo), no
  // la página visible. Usa el contexto de filtros actual, no `data.results`.
  const { mutate: exportPdf, isPending: isExporting } =
    useExportStockMovementReportPdf();
  const handleExportPdf = () => {
    // Los checks de null estrechan los tipos (equivalen a `gateComplete`, que
    // siempre es cierto cuando este botón está visible).
    if (tipoMovimiento === null || fechaInicio === null || fechaFinal === null)
      return;
    exportPdf({
      tipo_movimiento: tipoMovimiento,
      fecha_inicio: fechaInicio,
      fecha_final: fechaFinal,
      almacen_id: almacenId ?? undefined,
    });
  };

  return (
    <div className="w-full space-y-8">
      <div className="space-y-3">
        <button
          type="button"
          onClick={onBack}
          className="flex w-fit items-center gap-2 cursor-pointer rounded-full bg-slate-50 px-4 py-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-sky-500 dark:bg-slate-900 dark:hover:bg-slate-800"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          <span className="text-sm font-medium">Volver a reportes</span>
        </button>
        <p className="text-slate-500 dark:text-slate-400">
          Reporte de movimientos por periodo. Selecciona un tipo de movimiento y
          un rango de fechas para generarlo (el almacén es opcional).
        </p>
      </div>

      <StockMovementReportFilters
        tipoMovimiento={tipoMovimiento}
        almacenId={almacenId}
        fechaInicio={fechaInicio}
        fechaFinal={fechaFinal}
        onTipoChange={handleTipoChange}
        onAlmacenChange={handleAlmacenChange}
        onDateRangeChange={handleDateRangeChange}
      />

      {!gateComplete ? (
        <p className="text-sm text-slate-400 dark:text-slate-500">
          Selecciona un tipo de movimiento y un rango de fechas para ver el
          reporte.
        </p>
      ) : isLoading ? (
        // Solo en la primera carga: aún no hay datos previos que mostrar.
        <Loader className="py-20" title="Generando reporte..." />
      ) : data ? (
        // Se comprueba `data` ANTES que `isError`: si un refetch en segundo
        // plano (cambio de página/refresco) falla pero `keepPreviousData`
        // conserva la última respuesta buena, se mantiene esa vista en lugar de
        // reemplazarla por la pantalla de error. `isError` solo se muestra
        // cuando no hay ningún dato que preservar (fallo en la carga inicial).
        <div className="space-y-6">
          {/* El resumen refleja el periodo completo (campo NO paginado): no
              cambia al navegar entre páginas, así que NO se atenúa en un cambio
              de página. Pero en un cambio de CONTEXTO los datos mostrados son aún
              del contexto anterior, por lo que se atenúa igual que la tabla hasta
              que llegue la respuesta nueva. */}
          <div
            className={
              isStaleContext
                ? "blur-sm pointer-events-none select-none transition-[filter] duration-200"
                : "transition-[filter] duration-200"
            }
          >
            <StockMovementReportSummary summary={data.resumen} />
          </div>

          {/* Paginación de servidor: `data.results` ya es solo la página actual;
              `DataTable` no la recorta y cablea su pager a `setPage`. */}
          <DataTable
            columns={stockMovementReportColumns}
            data={data.results}
            emptyMessage="No se encontraron movimientos para el tipo, almacén y periodo seleccionados."
            actionButton={
              <Button
                variant="secondary"
                leftIcon={<DownloadIcon className="w-4 h-4 shrink-0" />}
                onClick={handleExportPdf}
                disabled={isExporting}
                aria-label="Exportar el reporte completo a PDF"
                title="Exportar todo el reporte (todas las páginas) a PDF"
              >
                {isExporting ? "Generando PDF..." : "Exportar a PDF"}
              </Button>
            }
            serverPagination={{
              pageCount: Math.max(1, Math.ceil(data.count / PAGE_SIZE)),
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
          />
        </div>
      ) : (
        // Único caso restante: gate completo, sin cargar y sin datos que
        // preservar ⇒ falló la carga inicial.
        <ErrorState
          title="Error al generar el reporte"
          message={extractErrorMessage(error, "No se pudo generar el reporte.")}
        />
      )}
    </div>
  );
}
