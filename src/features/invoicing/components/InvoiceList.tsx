"use client";

import { useMemo, useState } from "react";
import { DataTable } from "@/src/components/DataTable";
import { invoiceColumns } from "./InvoiceColumns";
import { CreateInvoiceDialog } from "./CreateInvoiceDialog";
import { useInvoices } from "../hooks/useInvoices";
import { CloseIcon } from "@/src/components/Icons";
import { ErrorState } from "@/src/components/ErrorState";
import { parseLocalDate } from "@/src/utils/formatDate";

export const InvoiceList = () => {
  const { invoices, hasLoaded, isLoading, isError, error, refetch, isFetching } =
    useInvoices();

  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [appliedStartDate, setAppliedStartDate] = useState("");
  const [appliedEndDate, setAppliedEndDate] = useState("");

  const filteredInvoices = useMemo(() => {
    const start = parseLocalDate(appliedStartDate);
    const end = parseLocalDate(appliedEndDate);

    // Sin filtro activo se muestran todas las facturas (no descartamos las
    // que carezcan de una fecha de emisión válida).
    if (!start && !end) return invoices;

    return invoices.filter((invoice) => {
      const invoiceDate = parseLocalDate(invoice.fecha_emision);
      if (!invoiceDate) return false;
      if (start && invoiceDate < start) return false;
      if (end) {
        const endOfDay = new Date(end);
        endOfDay.setHours(23, 59, 59, 999);
        if (invoiceDate > endOfDay) return false;
      }
      return true;
    });
  }, [invoices, appliedStartDate, appliedEndDate]);

  const hasAppliedFilters = Boolean(appliedStartDate || appliedEndDate);
  const isApplyDisabled =
    startDate === appliedStartDate && endDate === appliedEndDate;

  const handleApplyFilters = () => {
    setAppliedStartDate(startDate);
    setAppliedEndDate(endDate);
  };

  const handleClearFilters = () => {
    setStartDate("");
    setEndDate("");
    setAppliedStartDate("");
    setAppliedEndDate("");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-100">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600" />
        <span className="ml-3 text-sm text-slate-500">Cargando facturas...</span>
      </div>
    );
  }

  // Solo mostramos el estado de error a pantalla completa cuando la consulta
  // nunca cargó con éxito; un error de refetch transitorio no debe descartar
  // la tabla ya cargada (perdiendo orden, paginación, búsqueda y filtros del
  // usuario), incluso si el conjunto cargado estaba vacío.
  if (isError && !hasLoaded) {
    return (
      <ErrorState
        title="Error al cargar las facturas"
        message={(error as Error).message}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-500">
              Fecha inicio
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-500">
              Fecha final
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500"
            />
          </div>
        </div>
        <div className="flex items-end gap-2">
          <button
            type="button"
            onClick={handleApplyFilters}
            disabled={isApplyDisabled}
            className={`px-4 py-2 rounded-xl text-sm font-semibold border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/10 transition-colors ${
              isApplyDisabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
            }`}
          >
            Aplicar
          </button>
          {hasAppliedFilters ? (
            <button
              type="button"
              onClick={handleClearFilters}
              className="p-2 rounded-full border border-slate-200 dark:border-white/10 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/10 transition-colors cursor-pointer"
              aria-label="Limpiar filtros"
              title="Limpiar filtros"
            >
              <CloseIcon className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </div>

      <DataTable
        title="Facturación"
        columns={invoiceColumns}
        data={filteredInvoices}
        baseDataCount={invoices.length}
        searchPlaceholder="Buscar por folio, cliente o estatus..."
        onRefetch={refetch}
        isRefetching={isFetching}
        actionButton={
          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="px-4 py-2 cursor-pointer bg-sky-600 hover:bg-sky-700 text-white text-sm font-semibold rounded-full shadow-lg shadow-sky-500/30 transition-all hover:scale-105 active:scale-95 whitespace-nowrap"
          >
            + Nueva Factura
          </button>
        }
      />

      <CreateInvoiceDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onSuccess={() => setIsCreateOpen(false)}
      />
    </div>
  );
};
