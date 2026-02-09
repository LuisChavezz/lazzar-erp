"use client";

import { useCurrencies } from "../hooks/useCurrencies";
import { DataTable } from "@/src/components/DataTable";
import { currencyColumns } from "./CurrencyColumns";

export default function CurrencyList() {
  const { data: currencies, isLoading, isError, error } = useCurrencies();

  if (isLoading) {
    return (
      <div className="p-8 flex justify-center items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600"></div>
        <span className="ml-3 text-slate-500">Cargando monedas...</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-4 rounded-lg border border-red-200 bg-red-50 text-red-600">
        <p className="font-medium">Error al cargar monedas</p>
        <p className="text-sm opacity-80">{(error as Error).message}</p>
      </div>
    );
  }

  if (!currencies) return null;

  return (
    <DataTable
      columns={currencyColumns}
      data={currencies}
      title="Monedas"
      searchPlaceholder="Buscar moneda..."
    />
  );
}
