import { useMemo, useState, useCallback } from "react";
import { DataTable } from "../../../components/DataTable";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { Button } from "../../../components/Button";
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
  const canEditConfig = isAdmin || permissions.includes("E-CONFIGURACION");
  const canDeleteConfig = isAdmin || permissions.includes("D-CONFIGURACION");

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

  return (
    <DataTable
      columns={columns}
      data={categories}
      title="Categorías de Producto"
      searchPlaceholder="Buscar categoría..."
      isLoading={isLoading}
      isError={isError}
      errorTitle="Error al cargar categorías"
      errorMessage={extractErrorMessage(error, "No se pudo cargar la información.")}
      loadingAriaLabel="Cargando categorías"
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
              <Button
                variant="primary"
                rounded="full"
                onClick={handleNew}
                className="hover:scale-105 active:scale-95"
              >
                + Nueva Categoría
              </Button>
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
