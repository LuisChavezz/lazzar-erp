"use client";

import { useCallback, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { DataTable } from "@/src/components/DataTable";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { MainDialog } from "@/src/components/MainDialog";
import { Button } from "@/src/components/Button";
import { PlusIcon } from "@/src/components/Icons";
import SupplierForm from "./SupplierForm";
import { useSuppliers } from "../hooks/useSuppliers";
import { getSupplierColumns } from "./SupplierColumns";
import { Supplier } from "../interfaces/supplier.interface";

interface SupplierListProps {
  hideTitle?: boolean;
}

export default function SupplierList({ hideTitle = false }: SupplierListProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [supplierToEdit, setSupplierToEdit] = useState<Supplier | null>(null);
  const { suppliers, isLoading, isError, error } = useSuppliers();
  const { data: session } = useSession();

  const isAdmin = session?.user?.role === "admin";
  const permissions = session?.user?.permissions ?? [];
  const canEdit = isAdmin || permissions.includes("E-COMPRAS");
  const canDelete = isAdmin || permissions.includes("D-COMPRAS");

  const isEditing = Boolean(supplierToEdit?.id);

  const handleEdit = useCallback((supplier: Supplier) => {
    setSupplierToEdit(supplier);
    setIsDialogOpen(true);
  }, []);

  const handleCreate = useCallback(() => {
    setSupplierToEdit(null);
    setIsDialogOpen(true);
  }, []);

  const handleDialogOpenChange = useCallback((open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      setSupplierToEdit(null);
    }
  }, []);

  const handleSuccess = useCallback(() => {
    setIsDialogOpen(false);
    setSupplierToEdit(null);
  }, []);

  const columns = useMemo(
    () => getSupplierColumns(handleEdit, { canEdit, canDelete }),
    [handleEdit, canEdit, canDelete]
  );

  return (
    <>
      <DataTable
        columns={columns}
        data={suppliers}
        title={hideTitle ? undefined : "Proveedores"}
        searchPlaceholder="Buscar proveedor..."
        actionButton={
          canEdit ? (
            <Button
              variant="primary"
              leftIcon={<PlusIcon className="w-4 h-4" />}
              onClick={handleCreate}
            >
              Nuevo Proveedor
            </Button>
          ) : undefined
        }
        isLoading={isLoading}
        isError={isError}
        errorTitle="Error al cargar proveedores"
        errorMessage={extractErrorMessage(error, "No se pudo cargar la información.")}
        loadingAriaLabel="Cargando proveedores"
      />

      <MainDialog
        open={isDialogOpen}
        onOpenChange={handleDialogOpenChange}
        maxWidth="1000px"
        title={
          <div className="flex items-center gap-4 pb-4 border-b border-slate-200 dark:border-white/10 mb-4">
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white font-display tracking-tight">
                {isEditing ? "Editar Proveedor" : "Nuevo Proveedor"}
              </h1>
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-500" />
                </span>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  {isEditing ? "Edición de proveedor" : "Alta de proveedor"}
                </p>
              </div>
            </div>
          </div>
        }
      >
        <SupplierForm onSuccess={handleSuccess} supplierToEdit={supplierToEdit} />
      </MainDialog>
    </>
  );
}
