import { useMemo, useState, useCallback } from "react";
import { DataTable } from "../../../components/DataTable";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { Button } from "../../../components/Button";
import { getColumns } from "./ProductCategoryColumns";
import { MainDialog } from "../../../components/MainDialog";
import { DialogHeader } from "@/src/components/DialogHeader";
import { ProductCategory } from "../interfaces/product-category.interface";
import { useSession } from "next-auth/react";
import { hasPermission } from "@/src/utils/permissions";
import ProductCategoryForm from "./ProductCategoryForm";
import { useProductCategories } from "../hooks/useProductCategories";

export default function ProductCategoryList() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory | null>(null);
  const { categories, isLoading, isError, error } = useProductCategories();
  const { data: session } = useSession();
  // `hasPermission` ya cortocircuita para el rol admin, así que sustituye al
  // chequeo manual que vivía aquí. El alta usa su propio código
  // (C-CONFIGURACION), no el de edición.
  const canCreate = hasPermission("C-CONFIGURACION", session?.user);
  const canEdit = hasPermission("E-CONFIGURACION", session?.user);
  const canDelete = hasPermission("D-CONFIGURACION", session?.user);

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
    () => getColumns(handleEdit, { canEdit, canDelete }),
    [handleEdit, canEdit, canDelete]
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
        // El diálogo es DUAL (alta y edición: lo abre `handleEdit` por `open`,
        // sin pasar por el trigger), así que se monta también con solo permiso
        // de edición; lo que se oculta sin `canCreate` es el botón de alta.
        canCreate || canEdit ? (
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
              canCreate ? (
                <Button
                  variant="primary"
                  rounded="full"
                  onClick={handleNew}
                  className="hover:scale-105 active:scale-95"
                >
                  + Nueva Categoría
                </Button>
              ) : undefined
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
