"use client";

import { useState } from "react";
import { DataTable } from "@/src/components/DataTable";
import { MainDialog } from "@/src/components/MainDialog";
import { Button } from "@/src/components/Button";
import { PlusIcon } from "@/src/components/Icons";
import SupplierForm from "./SupplierForm";
import { ErrorState } from "@/src/components/ErrorState";
import { useSuppliers } from "../hooks/useSuppliers";
import columns from "./SupplierColumns";

export default function SupplierList() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { suppliers, isLoading, isError, error } = useSuppliers();

  const handleSuccess = () => {
    setIsDialogOpen(false);
  };

  if (isLoading) {
    return (
      <div className="p-8 flex justify-center items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600"></div>
        <span className="ml-3 text-slate-500">Cargando proveedores...</span>
      </div>
    );
  }

  if (isError) {
    return (
      <ErrorState title="Error al cargar proveedores" message={(error as Error).message} />
    );
  }

  return (
    <>
      <DataTable
        columns={columns}
        data={suppliers}
        title="Proveedores"
        searchPlaceholder="Buscar proveedor..."
        actionButton={
          <Button
            variant="primary"
            leftIcon={<PlusIcon className="w-4 h-4" />}
            onClick={() => setIsDialogOpen(true)}
          >
            Nuevo Proveedor
          </Button>
        }
      />

      <MainDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        maxWidth="1000px"
        title={
          <div className="flex items-center gap-4 pb-4 border-b border-slate-200 dark:border-white/10 mb-4">
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white font-display tracking-tight">
                Nuevo Proveedor
              </h1>
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-500" />
                </span>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Alta de proveedor
                </p>
              </div>
            </div>
          </div>
        }
      >
        <SupplierForm onSuccess={handleSuccess} />
      </MainDialog>
    </>
  );
}
