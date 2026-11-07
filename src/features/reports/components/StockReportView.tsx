"use client";

import { useState } from "react";
import { DataTable } from "@/src/components/DataTable";
import { Button } from "@/src/components/Button";
import { DownloadIcon } from "@/src/components/Icons";
import { StockReportFilters } from "./StockReportFilters";
import { StockReportSummary } from "./StockReportSummary";
import { stockReportColumns } from "./StockReportColumns";
import { useStockReport } from "@/src/features/stock/hooks/useStockReport";
import { useExportStockReportPdf } from "@/src/features/stock/hooks/useExportStockReportPdf";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { useWarehousePreselection } from "../hooks/useWarehousePreselection";

// Tamaño de página del endpoint (fijo). Alimenta el cálculo de páginas totales
// (`count / PAGE_SIZE`) que consume el pager de `DataTable`.
const PAGE_SIZE = 100;

/**
 * Reporte de existencias por periodo: gate (almacén + rango de fechas) →
 * resumen → tabla paginada en servidor → exportación PDF del conjunto
 * completo. Vive en su propia ruta (`/system/reports/existencias`).
 */
export function StockReportView() {
  const [almacenId, setAlmacenId] = useState<number | null>(null);
  // Almacén de la sucursal del workspace, solo si es el único (ver el hook).
  const warehousePreselection = useWarehousePreselection(almacenId, setAlmacenId);
  const [fechaInicio, setFechaInicio] = useState<string | null>(null);
  const [fechaFinal, setFechaFinal] = useState<string | null>(null);
  // `page` se reinicia a 1 al cambiar de almacén o de rango: un contexto de
  // consulta nuevo no debe reanudar en una página vieja.
  const [page, setPage] = useState(1);

  const gateComplete =
    almacenId !== null && fechaInicio !== null && fechaFinal !== null;

  const { data, isLoading, isInitialError, isFetching, isPlaceholderData, error, refetch } =
    useStockReport(
      gateComplete
        ? {
            almacen_id: almacenId,
            fecha_inicio: fechaInicio,
            fecha_final: fechaFinal,
            page,
            page_size: PAGE_SIZE,
          }
        : null,
    );

  // Transición de CONTEXTO (almacén/fechas), no de página: con `keepPreviousData`
  // se sigue viendo la respuesta del contexto anterior mientras llega la nueva.
  // La respuesta echa el contexto al que pertenece (`filtros`/fechas), así que
  // detectamos cuando los datos mostrados ya no corresponden al contexto elegido
  // — a diferencia de un simple cambio de página, donde el `resumen` es idéntico
  // y no debe atenuarse. Se usa `?.` por si el backend omitiera `filtros`.
  const isStaleContext =
    isFetching &&
    data !== undefined &&
    (data.filtros?.almacen_id !== almacenId ||
      data.fecha_inicio !== fechaInicio ||
      data.fecha_final !== fechaFinal);

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

  // Exportación a PDF del reporte COMPLETO (todas las páginas del periodo), no
  // la página visible. Usa el contexto de filtros actual, no `data.results`.
  const { mutate: exportPdf, isPending: isExporting } = useExportStockReportPdf();
  const handleExportPdf = () => {
    // Los checks de null estrechan los tipos a `number`/`string` (equivalen a
    // `gateComplete`, que siempre es cierto cuando este botón está visible).
    if (almacenId === null || fechaInicio === null || fechaFinal === null) return;
    exportPdf({
      almacen_id: almacenId,
      fecha_inicio: fechaInicio,
      fecha_final: fechaFinal,
    });
  };

  return (
    <div className="w-full space-y-8">
      <p className="text-slate-500 dark:text-slate-400">
        Reporte de existencias por periodo. Selecciona un almacén y un rango
        de fechas para generarlo.
      </p>

      <StockReportFilters
        almacenId={almacenId}
        fechaInicio={fechaInicio}
        fechaFinal={fechaFinal}
        onAlmacenChange={handleAlmacenChange}
        onDateRangeChange={handleDateRangeChange}
      />

      {!gateComplete ? (
        <p className="text-sm text-slate-400 dark:text-slate-500">
          Selecciona un almacén y un rango de fechas para ver el reporte.
        </p>
      ) : (
        <div className="space-y-6">
          {/* El resumen depende de `data` (campo NO paginado, sin un "vacío"
              natural que fabricar): solo se muestra una vez que llegó la
              primera respuesta buena, igual que antes. No se atenúa en un
              cambio de página; en un cambio de CONTEXTO (almacén/fechas) los
              datos mostrados son aún del contexto anterior, por lo que se
              atenúa igual que la tabla hasta que llegue la respuesta nueva. */}
          {data && (
            <div
              className={
                isStaleContext
                  ? "blur-sm pointer-events-none select-none transition-[filter] duration-200"
                  : "transition-[filter] duration-200"
              }
            >
              <StockReportSummary summary={data.resumen} />
            </div>
          )}

          {/* `DataTable` se monta SIEMPRE (recibe `isLoading`/`isError` y
              alterna solo su cuerpo), así que su toolbar y `actionButton`
              ("Exportar a PDF") siguen disponibles durante la carga o un
              error. `isInitialError` (de `useGuardedQuery`) solo es cierto
              si estos parámetros nunca cargaron: un refetch en segundo plano
              que falla conserva la última respuesta buena y avisa con un
              toast, en lugar de reemplazarla por la pantalla de error.
              Paginación de servidor: `data.results` ya es solo la página
              actual; `DataTable` no la recorta y cablea su pager a `setPage`. */}
          <DataTable
            columns={stockReportColumns}
            data={data?.results ?? []}
            emptyMessage="No se encontraron existencias para el almacén y el periodo seleccionados."
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
              pageCount: Math.max(1, Math.ceil((data?.count ?? 0) / PAGE_SIZE)),
              currentPage: page,
              onPageChange: setPage,
              // Solo se deshabilita en una TRANSICIÓN (cambio de página o de
              // contexto), no en un refetch manual en el sitio.
              isFetching: isPlaceholderData,
            }}
            // `isPlaceholderData` es cierto solo mientras se ve la respuesta
            // previa durante una transición (cambio de página o de contexto), no
            // en un refetch manual en el sitio: así el overlay no atenúa la tabla
            // al refrescar. El texto distingue cambio de contexto vs. de página.
            isLoadingOverlay={isPlaceholderData}
            loadingTitle={isStaleContext ? "Actualizando reporte" : "Actualizando página"}
            loadingMessage={
              isStaleContext
                ? "Cargando las existencias del contexto seleccionado."
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
