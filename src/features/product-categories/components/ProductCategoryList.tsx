import { useMemo, useState, useCallback } from "react";
import { DataTable } from "../../../components/DataTable";
import { ErrorState } from "../../../components/ErrorState";
import { getColumns } from "./ProductCategoryColumns";
import { MainDialog } from "../../../components/MainDialog";
import { DialogHeader } from "@/src/components/DialogHeader";
import { ProductCategory } from "../interfaces/product-category.interface";
import { useSession } from "next-auth/react";
import ProductCategoryForm from "./ProductCategoryForm";
import { useProductCategories } from "../hooks/useProductCategories";

export default function ProductCategoryList() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory | null>(null);
  const { categories, isLoading, isError, error } = useProductCategories();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "admin";
  const permissions = session?.user?.permissions ?? [];
  const canEditConfig = isAdmin || permissions.includes("E-CONF");
  const canDeleteConfig = isAdmin || permissions.includes("D-CONF");

  const handleEdit = useCallback(
    (category: ProductCategory) => {
      setSelectedCategory(category);
      setIsDialogOpen(true);
    },
    [setSelectedCategory, setIsDialogOpen]
  );

  const handleNew = () => {
    setSelectedCategory(null);
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
        <span className="ml-3 text-slate-500">Cargando categorías...</span>
      </div>
    );
  }

  if (isError) {
    return (
      <ErrorState
        title="Error al cargar categorías"
        message={(error as Error).message}
      />
    );
  }

  return (
    <DataTable
      columns={columns}
      data={categories}
      title="Categorías de Producto"
      searchPlaceholder="Buscar categoría..."
      actionButton={
        canEditConfig ? (
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
            <ProductCategoryForm
              onSuccess={() => setIsDialogOpen(false)}
              categoryToEdit={selectedCategory}
            />
          </MainDialog>
        ) : null
      }
    />
  );
}
