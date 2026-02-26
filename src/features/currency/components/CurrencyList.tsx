"use client";

import { useState, useMemo } from "react";
import { useCurrencies } from "../hooks/useCurrencies";
import { DataTable } from "@/src/components/DataTable";
import { ErrorState } from "@/src/components/ErrorState";
import { getCurrencyColumns } from "./CurrencyColumns";
import { MainDialog } from "@/src/components/MainDialog";
import { DialogHeader } from "@/src/components/DialogHeader";
import { PlusIcon } from "@/src/components/Icons";
import { useSession } from "next-auth/react";
import CurrencyForm from "./CurrencyForm";

export default function CurrencyList() {
  const { data: currencies, isLoading, isError, error } = useCurrencies();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const { data: session } = useSession();

  const isAdmin = session?.user?.role === "admin";
  const permissions = session?.user?.permissions ?? [];
  const canEditConfig = isAdmin || permissions.includes("E-CONF");
  const canDeleteConfig = isAdmin || permissions.includes("D-CONF");
  const columns = useMemo(
    () => getCurrencyColumns({ canEdit: canEditConfig, canDelete: canDeleteConfig }),
    [canEditConfig, canDeleteConfig]
  );

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
      <ErrorState title="Error al cargar monedas" message={(error as Error).message} />
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
          <DialogHeader
            title="Nueva Moneda"
            subtitle="Información General"
            statusColor="emerald"
          />
        }
      >
        <CurrencyForm onSuccess={() => setIsCreateOpen(false)} />
      </MainDialog>

      <DataTable
        columns={columns}
        data={currencies}
        title="Monedas"
        searchPlaceholder="Buscar moneda..."
        actionButton={
          canEditConfig ? (
            <button
              onClick={() => setIsCreateOpen(true)}
              className="cursor-pointer bg-sky-600 hover:bg-sky-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors flex items-center gap-2 shadow-sm shadow-sky-600/20"
            >
              <PlusIcon className="w-5 h-5" />
              Nueva Moneda
            </button>
          ) : null
        }
      />
    </>
  );
}
