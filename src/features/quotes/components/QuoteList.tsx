"use client";

import { useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { DataTable, type DataTableVisibleColumn } from "@/src/components/DataTable";
import { Button } from "@/src/components/Button";
import { ExportCsvIcon, ExportPdfIcon, PlusIcon } from "@/src/components/Icons";
import { getQuoteColumns } from "./QuoteColumns";
import { QuoteRowActionDialogs } from "./QuoteRowActionDialogs";
import { useQuoteCsvExport } from "../hooks/useQuoteCsvExport";
import { useQuotePdfExport } from "../hooks/useQuotePdfExport";
import { QuoteRowActionsProvider, useQuoteRowActions } from "../hooks/useQuoteRowActions";
import { Quote } from "../interfaces/quote.interface";
import { LoadingSkeleton } from "@/src/components/LoadingSkeleton";
import { useQuotesTable } from "../hooks/useQuotesTable";
import { hasPermission } from "@/src/utils/permissions";

// A nivel de módulo: las columnas no dependen de nada del render.
const quoteColumns = getQuoteColumns();

/**
 * Listado de cotizaciones de Ventas en MODO SERVIDOR (`useQuotesTable`):
 * filtros, búsqueda, orden y página los resuelve el backend y viven en la
 * URL, así que la página lo envuelve en `<Suspense>`. Las exportaciones piden
 * al backend TODAS las filas de los criterios vigentes al hacer clic.
 */
export const QuoteList = () => {
  const { data: session, status: sessionStatus } = useSession();
  const table = useQuotesTable();
  const [visibleColumns, setVisibleColumns] = useState<DataTableVisibleColumn<Quote>[]>([]);
  const isSessionLoading = sessionStatus === "loading";
  // Gatea "+ Nueva cotización". Es el código de ALTA, no el de lectura de la
  // sección: ver el listado (`R-CRM-COTIZACIONES`, lo exige la ruta) no
  // habilita a crear.
  const canCreateQuote = hasPermission("C-CRM-COTIZACIONES", session?.user);

  useQuoteCsvExport(table.fetchAllRows, visibleColumns);
  useQuotePdfExport(table.fetchAllRows, visibleColumns);

  // Acciones de fila (menú del chip #id): la LISTA es dueña de las mutaciones
  // y de los diálogos; la celda solo señala qué acción se eligió (por
  // contexto, para que `quoteColumns` siga siendo un arreglo estático).
  const { onAction, busy, dialogs } = useQuoteRowActions();
  // Overlay de la tabla: trabajo en curso leído de la MutationCache (`busy`),
  // el mismo que acota el menú de cada fila; vale venga de esta vista o de
  // otra (el tablero comparte las claves). Autorizar NO lo enciende: su
  // confirmación ya queda abierta y bloqueada con "Autorizando..." mientras
  // la petición viaja, y el overlay repetía el mismo estado detrás.
  const isRejectingOrder = busy.some((b) => b.kind === "reject");
  const isValidatingReview = busy.some((b) => b.kind === "validateReview");
  const isTableBusy = isRejectingOrder || isValidatingReview;

  return (
    <QuoteRowActionsProvider value={{ onAction, busy }}>
    <div className="min-h-165">
      <QuoteRowActionDialogs quotes={table.rows} {...dialogs} />
      <DataTable
        columns={quoteColumns}
        {...table.tableProps}
        // Búsqueda del backend: OC, cliente (razón social, nombre o RFC) y el
        // número de cotización EXACTO.
        searchPlaceholder="Buscar por #, OC o cliente..."
        // Identidad de la fila por registro, no por posición en la página.
        getRowId={(row) => String(row.id)}
        onVisibleColumnsChange={setVisibleColumns}
        emptyMessage="Aún no hay cotizaciones"
        errorTitle="Error al cargar cotizaciones"
        loadingAriaLabel="Cargando cotizaciones"
        isLoadingOverlay={isTableBusy}
        loadingTitle={
          isValidatingReview ? "Validando cotización" : "Rechazando cotización"
        }
        loadingMessage={
          isValidatingReview
            ? "Estamos validando la cotización antes de enviarla a revisión. Espera un momento."
            : "Estamos actualizando el estado de la orden."
        }
        actionButton={
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="success"
              size="icon"
              onClick={() => document.dispatchEvent(new CustomEvent("quotes:exportCSV"))}
              title="Exportar a CSV (Excel)"
              aria-label="Exportar cotizaciones a CSV"
            >
              <ExportCsvIcon className="w-4 h-4 shrink-0" />
            </Button>
            <Button
              variant="danger"
              size="icon"
              onClick={() => document.dispatchEvent(new CustomEvent("quotes:exportPDF"))}
              title="Exportar a PDF"
              aria-label="Exportar cotizaciones a PDF"
            >
              <ExportPdfIcon className="w-4 h-4 shrink-0" />
            </Button>
            {isSessionLoading ? (
              <div className="w-44 shrink-0" aria-hidden="true">
                <LoadingSkeleton className="h-10 rounded-xl" />
              </div>
            ) : canCreateQuote ? (
              // Acceso rápido: ícono + etiqueta en píldora, en vez del "+" como
              // simple caracter de texto — se lee como atajo, no como botón más
              // de la barra.
              <Button asChild variant="primary" rounded="full">
                <Link href="/sales/quotes/new" aria-label="Crear nueva cotización">
                  <PlusIcon className="w-4 h-4 shrink-0" />
                  Nueva cotización
                </Link>
              </Button>
            ) : null}
          </div>
        }
      />
    </div>
    </QuoteRowActionsProvider>
  );
};
