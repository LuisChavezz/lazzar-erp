"use client";

import { useCallback, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { DataTable } from "@/src/components/DataTable";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { MainDialog } from "@/src/components/MainDialog";
import { Button } from "@/src/components/Button";
import { PlusIcon } from "@/src/components/Icons";
import { hasPermission } from "@/src/utils/permissions";
import SupplierForm from "./SupplierForm";
import { useSuppliers } from "../hooks/useSuppliers";
import { getSupplierColumns } from "./SupplierColumns";
import { Supplier } from "../interfaces/supplier.interface";

/**
 * Códigos de permiso por punto de montaje.
 *
 * Este listado se alcanza desde DOS módulos distintos y cada uno tiene su propia
 * familia en el catálogo de la tabla `permisos`: quien administra proveedores
 * desde Compras no es necesariamente quien administra los catálogos del sistema.
 * La lectura ya la controla la ruta de cada módulo (`R-COMPRAS-PROV` en
 * `/procurement/suppliers`, `R-CONFIGURACION` en `/config`); esto solo decide
 * qué códigos gobiernan alta, edición y baja.
 */
const PERMISSIONS_BY_CONTEXT = {
  procurement: {
    create: "C-COMPRAS-PROV",
    edit: "E-COMPRAS-PROV",
    delete: "D-COMPRAS-PROV",
  },
  config: {
    create: "C-CONFIGURACION",
    edit: "E-CONFIGURACION",
    delete: "D-CONFIGURACION",
  },
} as const;

interface SupplierListProps {
  hideTitle?: boolean;
  /**
   * Familia de permisos a aplicar según desde dónde se monte el listado.
   * Por defecto "procurement", que es el comportamiento histórico.
   */
  permissionContext?: keyof typeof PERMISSIONS_BY_CONTEXT;
}

export default function SupplierList({
  hideTitle = false,
  permissionContext = "procurement",
}: SupplierListProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [supplierToEdit, setSupplierToEdit] = useState<Supplier | null>(null);
  const { suppliers, isLoading, isError, error } = useSuppliers();
  const { data: session } = useSession();

  // `hasPermission` ya cortocircuita para el rol "admin", así que no hace falta
  // el `isAdmin || ...` manual que vivía aquí.
  const permissions = PERMISSIONS_BY_CONTEXT[permissionContext];
  const canCreate = hasPermission(permissions.create, session?.user);
  const canEdit = hasPermission(permissions.edit, session?.user);
  const canDelete = hasPermission(permissions.delete, session?.user);

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
          // El alta se rige por C-COMPRAS-PROV, no por el permiso de edición:
          // son dos capacidades distintas del catálogo.
          canCreate ? (
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
