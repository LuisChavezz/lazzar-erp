"use client";

import { useState } from "react";
import { useCurrencies } from "../hooks/useCurrencies";
import { DataTable } from "@/src/components/DataTable";
import { currencyColumns } from "./CurrencyColumns";
import { MainDialog } from "@/src/components/MainDialog";
import CurrencyForm from "./CurrencyForm";
import { PlusIcon } from "@/src/components/Icons";

export default function CurrencyList() {
  const { data: currencies, isLoading, isError, error } = useCurrencies();
  const [isCreateOpen, setIsCreateOpen] = useState(false);

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
    <>
      <MainDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        maxWidth="1000px"
        title={
          <div className="flex items-center gap-4 pb-4 border-b border-slate-200 dark:border-white/10 mb-4">
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white font-display tracking-tight">
                Nueva Moneda
              </h1>
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-500"></span>
                </span>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Información General
                </p>
              </div>
            </div>
          </div>
        }
      >
        <CurrencyForm onSuccess={() => setIsCreateOpen(false)} />
      </MainDialog>

      <DataTable
        columns={currencyColumns}
        data={currencies}
        title="Monedas"
        searchPlaceholder="Buscar moneda..."
        actionButton={
          <button
            onClick={() => setIsCreateOpen(true)}
            className="cursor-pointer bg-sky-600 hover:bg-sky-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors flex items-center gap-2 shadow-sm shadow-sky-600/20"
          >
            <PlusIcon className="w-5 h-5" />
            Nueva Moneda
          </button>
        }
      />
    </>
  );
}
