import { useMemo, useState, useCallback } from "react";
import { DataTable } from "../../../components/DataTable";
import { useProductTypeStore } from "../stores/product-type.store";
import { getColumns } from "./ProductTypeColumns";
import { MainDialog } from "../../../components/MainDialog";
import { DialogHeader } from "@/src/components/DialogHeader";
import { ProductType } from "../interfaces/product-type.interface";
import { useSession } from "next-auth/react";
import ProductTypeForm from "./ProductTypeForm";

export default function ProductTypeList() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { productTypes, setSelectedProductType, selectedProductType } = useProductTypeStore(
    (state) => state
  );
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "admin";
  const isEditing = Boolean(selectedProductType?.id);

  const handleEdit = useCallback(
    (productType: ProductType) => {
      setSelectedProductType(productType);
      setIsDialogOpen(true);
    },
    [setSelectedProductType]
  );

  const handleNew = () => {
    setSelectedProductType({} as ProductType);
    setIsDialogOpen(true);
  };

  const columns = useMemo(() => getColumns(handleEdit, isAdmin), [handleEdit, isAdmin]);

  return (
    <DataTable
      columns={columns}
      data={productTypes}
      title="Tipos de Producto"
      searchPlaceholder="Buscar tipo..."
      actionButton={
        isAdmin ? (
          <MainDialog
            title={
              <DialogHeader
                title={isEditing ? "Editar Tipo de Producto" : "Alta de Tipo de Producto"}
                subtitle={isEditing ? "Edición de registro" : "Registro Nuevo"}
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
            <ProductTypeForm onSuccess={() => setIsDialogOpen(false)} />
          </MainDialog>
        ) : null
      }
    />
  );
}
