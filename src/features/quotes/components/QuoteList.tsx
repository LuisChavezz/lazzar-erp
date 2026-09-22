"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useIsMutating } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import {
  DataTable,
  type DataTableHandle,
  type DataTableVisibleColumn,
} from "@/src/components/DataTable";
import { Button } from "@/src/components/Button";
import { ExportCsvIcon, ExportPdfIcon, PlusIcon } from "@/src/components/Icons";
import { quoteColumns } from "./QuoteColumns";
import { QuoteRowActionDialogs } from "./QuoteRowActionDialogs";
import { useQuoteCsvExport } from "../hooks/useQuoteCsvExport";
import { useQuotePdfExport } from "../hooks/useQuotePdfExport";
import { QuoteRowActionsProvider, useQuoteRowActions } from "../hooks/useQuoteRowActions";
import { Quote } from "../interfaces/quote.interface";
import { LoadingSkeleton } from "@/src/components/LoadingSkeleton";
import { useQuotes } from "../hooks/useQuotes";
import { approveOperationsQuoteMutationKey } from "../../operations/hooks/useApproveOperationsQuote";
import { rejectOperationsQuoteMutationKey } from "../../operations/hooks/useRejectOperationsQuote";
import { hasPermission } from "@/src/utils/permissions";
import { validateQuoteForReviewMutationKey } from "../hooks/useValidateQuoteForReview";

export const QuoteList = () => {
  const { data: session, status: sessionStatus } = useSession();
  const { quotes, isLoading: isOrdersLoading } = useQuotes();
  // Las filas a exportar se LEEN de la tabla al hacer clic (`getFilteredRows`),
  // no se espejean en estado: así el archivo siempre lleva los datos vigentes.
  const tableRef = useRef<DataTableHandle<Quote>>(null);
  const getFilteredQuotes = () => tableRef.current?.getFilteredRows() ?? [];
  const [visibleColumns, setVisibleColumns] = useState<DataTableVisibleColumn<Quote>[]>([]);
  const isAuthorizingOrder =
    useIsMutating({ mutationKey: approveOperationsQuoteMutationKey }) > 0;
  const isRejectingOrder =
    useIsMutating({ mutationKey: rejectOperationsQuoteMutationKey }) > 0;
  const isValidatingReview =
    useIsMutating({ mutationKey: validateQuoteForReviewMutationKey }) > 0;
  const isUpdatingOrderStatus = isAuthorizingOrder || isRejectingOrder;
  const isTableBusy = isUpdatingOrderStatus || isValidatingReview;
  const isSessionLoading = sessionStatus === "loading";
  // Gatea "+ Nueva cotización". Es el código de ALTA, no el de lectura de la
  // sección: ver el listado (`R-CRM-COTIZACIONES`, lo exige la ruta) no
  // habilita a crear.
  const canCreateQuote = hasPermission("C-CRM-COTIZACIONES", session?.user);

  useQuoteCsvExport(getFilteredQuotes, visibleColumns);
  useQuotePdfExport(getFilteredQuotes, visibleColumns);

  // Acciones de fila (menú del chip #id): la LISTA es dueña de las mutaciones
  // y de los diálogos; la celda solo señala qué acción se eligió (por
  // contexto, para que `quoteColumns` siga siendo un arreglo estático).
  const { onAction, busy, dialogs } = useQuoteRowActions();

  return (
    <QuoteRowActionsProvider value={{ onAction, busy }}>
    <div className="min-h-165">
      <QuoteRowActionDialogs quotes={quotes} {...dialogs} />
      <DataTable
        ref={tableRef}
        columns={quoteColumns}
        data={quotes}
        baseDataCount={quotes.length}
        searchPlaceholder="Filtra resultados de la tabla"
        searchAlwaysExpanded
        defaultPageSize={20}
        density="compact"
        framed
        onVisibleColumnsChange={setVisibleColumns}
        isLoading={isOrdersLoading}
        loadingAriaLabel="Cargando cotizaciones"
        isLoadingOverlay={isTableBusy}
        loadingTitle={
          isValidatingReview
            ? "Validando cotización"
            : isRejectingOrder
              ? "Rechazando cotización"
              : "Autorizando cotización"
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
