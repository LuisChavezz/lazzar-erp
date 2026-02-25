"use client";

import { useMemo, useState } from "react";
import { DataTable } from "@/src/components/DataTable";
import { invoiceColumns } from "./InvoiceColumns";
import { Invoice } from "../interfaces/invoice.interface";
import { CloseIcon } from "@/src/components/Icons";

const MOCK_INVOICES: Invoice[] = [
  {
    pedido: "PED-2401",
    factura: "FAC-2026-1201",
    total: 25400,
    cliente: "Tecnología Avanzada S.A. de C.V.",
    vendedor: "Laura Pérez",
    paqueteria: "DHL",
    guias: "DHL-45902011",
    date: "13/02/2026",
  },
  {
    pedido: "PED-2402",
    factura: "FAC-2026-1202",
    total: 12850.5,
    cliente: "Consultoría Integral MX",
    vendedor: "Carlos Rivas",
    paqueteria: "FedEx",
    guias: "FDX-90122318",
    date: "12/02/2026",
  },
  {
    pedido: "PED-2399",
    factura: "FAC-2026-1198",
    total: 8900,
    cliente: "Distribuidora del Norte",
    vendedor: "Diana Ortega",
    paqueteria: "Estafeta",
    guias: "EST-77230012",
    date: "10/02/2026",
  },
  {
    pedido: "PED-2387",
    factura: "FAC-2026-1182",
    total: 4500,
    cliente: "Servicios Profesionales Globales",
    vendedor: "Mario Silva",
    paqueteria: "PaqueteExpress",
    guias: "PEX-55100987",
    date: "01/02/2026",
  },
  {
    pedido: "PED-2405",
    factura: "FAC-2026-1205",
    total: 156000,
    cliente: "Grupo Constructor Elite",
    vendedor: "Andrea Soto",
    paqueteria: "DHL",
    guias: "DHL-77100823",
    date: "13/02/2026",
  },
];

const parseDateValue = (value: string) => {
  const [day, month, year] = value.split("/").map((part) => Number(part));
  if (!day || !month || !year) return null;
  return new Date(year, month - 1, day);
};

const parseInputDate = (value: string) => {
  if (!value) return null;
  const [year, month, day] = value.split("-").map((part) => Number(part));
  if (!day || !month || !year) return null;
  return new Date(year, month - 1, day);
};

export const InvoiceList = () => {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [appliedStartDate, setAppliedStartDate] = useState("");
  const [appliedEndDate, setAppliedEndDate] = useState("");

  const filteredInvoices = useMemo(() => {
    const start = parseInputDate(appliedStartDate);
    const end = parseInputDate(appliedEndDate);

    return MOCK_INVOICES.filter((invoice) => {
      const invoiceDate = parseDateValue(invoice.date);
      if (!invoiceDate) return false;
      if (start && invoiceDate < start) return false;
      if (end) {
        const endOfDay = new Date(end);
        endOfDay.setHours(23, 59, 59, 999);
        if (invoiceDate > endOfDay) return false;
      }
      return true;
    });
  }, [appliedStartDate, appliedEndDate]);

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
        columns={invoiceColumns}
        data={filteredInvoices}
        title="Facturación"
        searchPlaceholder="Buscar por pedido, factura o cliente..."
      />
    </div>
  );
};
