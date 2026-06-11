"use client";

import { useState } from "react";
import { DataTable } from "@/src/components/DataTable";
import { MainDialog } from "@/src/components/MainDialog";
import { Button } from "@/src/components/Button";
import { PlusIcon } from "@/src/components/Icons";
import type { ColumnDef } from "@tanstack/react-table";
import SupplierForm from "./SupplierForm";

// ─── Interfaz mínima para el placeholder de la tabla ──────────────────────────
interface SupplierRow {
  id: number;
  codigo: string;
  nombre: string;
  rfc: string;
}

const columns: ColumnDef<SupplierRow>[] = [
  {
    accessorKey: "codigo",
    header: "Código",
    cell: (info) => (
      <span className="font-mono text-xs font-semibold text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-500/10 px-2 py-1 rounded-lg">
        {info.getValue<string>()}
      </span>
    ),
  },
  {
    accessorKey: "nombre",
    header: "Nombre",
    cell: (info) => (
      <span className="font-medium text-slate-900 dark:text-white">
        {info.getValue<string>()}
      </span>
    ),
  },
  {
    accessorKey: "rfc",
    header: "RFC",
    cell: (info) => (
      <span className="font-mono text-sm text-slate-600 dark:text-slate-400">
        {info.getValue<string>()}
      </span>
    ),
  },
];

export default function SupplierList() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleSuccess = () => {
    setIsDialogOpen(false);
  };

  return (
    <>
      <DataTable
        columns={columns}
        data={[]}
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
