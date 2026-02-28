import { useMemo, useState, useCallback } from "react";
import { DataTable } from "../../../components/DataTable";
import { ErrorState } from "../../../components/ErrorState";
import { getColumns } from "./ProductTypeColumns";
import { MainDialog } from "../../../components/MainDialog";
import { DialogHeader } from "@/src/components/DialogHeader";
import { ProductType } from "../interfaces/product-type.interface";
import { useSession } from "next-auth/react";
import ProductTypeForm from "./ProductTypeForm";
import { useProductTypes } from "../hooks/useProductTypes";

export default function ProductTypeList() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedProductType, setSelectedProductType] = useState<ProductType | null>(null);
  const { productTypes, isLoading, isError, error } = useProductTypes();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "admin";
  const permissions = session?.user?.permissions ?? [];
  const canEditConfig = isAdmin || permissions.includes("E-CONF");
  const canDeleteConfig = isAdmin || permissions.includes("D-CONF");

  const handleEdit = useCallback(
    (productType: ProductType) => {
      setSelectedProductType(productType);
      setIsDialogOpen(true);
    },
    [setSelectedProductType, setIsDialogOpen]
  );

  const handleNew = () => {
    setSelectedProductType(null);
    setIsDialogOpen(true);
  };

  const columns = useMemo(
    () => getColumns(handleEdit, { canEdit: canEditConfig, canDelete: canDeleteConfig }),
    [handleEdit, canEditConfig, canDeleteConfig]
  );

  if (isLoading) {
    return (
      <div className="p-8 flex justify-center items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600"></div>
        <span className="ml-3 text-slate-500">Cargando tipos de producto...</span>
      </div>
    );
  }

  if (isError) {
    return (
      <ErrorState
        title="Error al cargar tipos de producto"
        message={(error as Error).message}
      />
    );
  }

  return (
    <DataTable
      columns={columns}
      data={productTypes}
      title="Tipos de Producto"
      searchPlaceholder="Buscar tipo..."
      actionButton={
        canEditConfig ? (
          <MainDialog
            title={
              <DialogHeader
                title={selectedProductType ? "Editar Tipo de Producto" : "Alta de Tipo de Producto"}
                subtitle={selectedProductType ? "Edición de registro" : "Registro Nuevo"}
                statusColor="emerald"
              />
            }
            open={isDialogOpen}
            onOpenChange={setIsDialogOpen}
            maxWidth="1000px"
            trigger={
              <button
                onClick={handleNew}
                className="px-4 py-2 cursor-pointer bg-sky-600 hover:bg-sky-700 text-white text-sm font-semibold rounded-full shadow-lg shadow-sky-500/30 transition-all hover:scale-105 active:scale-95 whitespace-nowrap"
              >
                + Nuevo Tipo
              </button>
            }
          >
            <ProductTypeForm
              onSuccess={() => setIsDialogOpen(false)}
              productTypeToEdit={selectedProductType}
            />
          </MainDialog>
        ) : null
      }
    />
  );
}
