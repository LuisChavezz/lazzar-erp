"use client";

import { useState } from "react";
import Link from "next/link";
import { useIsMutating } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { DataTable, DataTableVisibleColumn } from "@/src/components/DataTable";
import { Button } from "@/src/components/Button";
import { quoteColumns } from "./QuoteColumns";
import { useQuoteCsvExport } from "../hooks/useQuoteCsvExport";
import { useQuotePdfExport } from "../hooks/useQuotePdfExport";
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
  const [visibleOrders, setVisibleOrders] = useState<Quote[]>([]);
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
  const canCreateOrder = hasPermission("R-CRM", session?.user);

  useQuoteCsvExport(visibleOrders, visibleColumns);
  useQuotePdfExport(visibleOrders, visibleColumns);

  return (
    <div className="mt-12 min-h-165">
      <DataTable
        columns={quoteColumns}
        data={quotes}
        baseDataCount={quotes.length}
        searchPlaceholder="Buscar cotización..."
        onVisibleRowsChange={setVisibleOrders}
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
          isSessionLoading ? (
            <div className="w-44 shrink-0" aria-hidden="true">
              <LoadingSkeleton className="h-10 rounded-xl" />
            </div>
          ) : canCreateOrder ? (
            <div className="flex items-center gap-2 shrink-0">
              <Button asChild variant="primary" rounded="xl">
                <Link
                  href="/sales/quotes/new"
                  aria-label="Crear nueva cotización"
                >
                  + Nueva cotización
                </Link>
              </Button>
            </div>
          ) : null
        }
      />
    </div>
  );
};
