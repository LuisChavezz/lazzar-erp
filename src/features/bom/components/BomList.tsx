"use client";

import { useState } from "react";
import { DataTable } from "@/src/components/DataTable";
import { ErrorState } from "@/src/components/ErrorState";
import { Button } from "@/src/components/Button";
import { useProducts } from "@/src/features/products/hooks/useProducts";
import { columns } from "./BomColumns";
import { CreateBomDialog } from "./CreateBomDialog";

export default function BomList() {
  const { products, isLoading, isError, error } = useProducts("2");
  const [open, setOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="p-8 flex justify-center items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600"></div>
        <span className="ml-3 text-slate-500">Cargando lista de materiales...</span>
      </div>
    );
  }

  if (isError) {
    return (
      <ErrorState
        title="Error al cargar la lista de materiales"
        message={(error as Error).message}
      />
    );
  }

  return (
    <>
      <DataTable
        columns={columns}
        data={products}
        title="Materiales"
        searchPlaceholder="Buscar material..."
        actionButton={
          <Button
            variant="primary"
            rounded="full"
            onClick={() => setOpen(true)}
          >
            + Agregar
          </Button>
        }
      />

      <CreateBomDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
