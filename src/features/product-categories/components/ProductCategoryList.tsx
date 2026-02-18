import { useMemo, useState, useCallback } from "react";
import { DataTable } from "../../../components/DataTable";
import { useProductCategoryStore } from "../stores/product-category.store";
import { getColumns } from "./ProductCategoryColumns";
import { MainDialog } from "../../../components/MainDialog";
import { DialogHeader } from "@/src/components/DialogHeader";
import { ProductCategory } from "../interfaces/product-category.interface";
import { useSession } from "next-auth/react";
import ProductCategoryForm from "./ProductCategoryForm";

export default function ProductCategoryList() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { categories, setSelectedCategory, selectedCategory } = useProductCategoryStore(
    (state) => state
  );
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "admin";

  const handleEdit = useCallback((category: ProductCategory) => {
    setSelectedCategory(category);
    setIsDialogOpen(true);
  }, [setSelectedCategory]);

  const handleNew = () => {
    setSelectedCategory(null);
    setIsDialogOpen(true);
  };

  const columns = useMemo(() => getColumns(handleEdit, isAdmin), [handleEdit, isAdmin]);

  return (
    <DataTable
      columns={columns}
      data={categories}
      title="Categorías de Producto"
      searchPlaceholder="Buscar categoría..."
      actionButton={
        isAdmin ? (
          <MainDialog
            title={
              <DialogHeader
                title={selectedCategory ? "Editar Categoría" : "Alta de Categoría"}
                subtitle={selectedCategory ? "Edición de registro" : "Registro Nuevo"}
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
                + Nueva Categoría
              </button>
            }
          >
            <ProductCategoryForm onSuccess={() => setIsDialogOpen(false)} />
          </MainDialog>
        ) : null
      }
    />
  );
}
