"use client";

import { DataTable } from "@/src/components/DataTable";
import { Loader } from "@/src/components/Loader";
import { customerColumns } from "./CustomerColumns";
import { useCustomers } from "../hooks/useCustomers";

export const CustomerList = () => {
  const { customers, isLoading } = useCustomers();

  if (isLoading) {
    return (
      <div className="mt-12 rounded-2xl border border-slate-200 dark:border-white/5 bg-white dark:bg-zinc-900 p-8">
        <Loader title="Cargando clientes" message="Obteniendo información de clientes..." />
      </div>
    );
  }

  return (
    <div className="mt-12">
      <DataTable
        columns={customerColumns}
        data={customers}
        searchPlaceholder="Buscar por razón social, nombre, correo o teléfono..."
      />
    </div>
  );
};
