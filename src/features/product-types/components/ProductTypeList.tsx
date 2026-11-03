import { useMemo, useState, useCallback } from "react";
import { DataTable } from "../../../components/DataTable";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { Button } from "../../../components/Button";
import { getColumns } from "./ProductTypeColumns";
import { MainDialog } from "../../../components/MainDialog";
import { ConfirmDialog } from "../../../components/ConfirmDialog";
import { useDialogSession } from "@/src/hooks/useDialogSession";
import { useDeleteProductType } from "../hooks/useDeleteProductType";
import { getProductTypeLabel } from "../utils/productTypeLabel";
import { DialogHeader } from "@/src/components/DialogHeader";
import { ProductType } from "../interfaces/product-type.interface";
import { useIsSuperuser } from "@/src/features/users/hooks/useIsSuperuser";
import ProductTypeForm from "./ProductTypeForm";
import { useProductTypes } from "../hooks/useProductTypes";

export default function ProductTypeList() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedProductType, setSelectedProductType] = useState<ProductType | null>(null);
  const { productTypes, isLoading, isInitialError, error } = useProductTypes();
  // Catálogo global: el backend (`SoloSuperusuarioEscribe`) solo deja escribir
  // al superusuario; un admin de empresa recibiría 403 (EC-714).
  const isSuperuser = useIsSuperuser();
  const canCreate = isSuperuser;
  const canEdit = isSuperuser;
  const canDelete = isSuperuser;

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

  // La confirmación de baja vive aquí y no en la celda: las celdas se
  // desmontan al ordenar, paginar o filtrar.
  const [productTypeToDelete, setProductTypeToDelete] = useState<ProductType | null>(null);
  const isDeleteOpen = productTypeToDelete !== null;
  const deleteSession = useDialogSession(isDeleteOpen, productTypeToDelete);
  const { mutate: deleteProductType } = useDeleteProductType();

  const handleDelete = useCallback((productType: ProductType) => {
    setProductTypeToDelete(productType);
  }, []);

  const columns = useMemo(
    () => getColumns(handleEdit, handleDelete, { canEdit, canDelete }),
    [handleEdit, handleDelete, canEdit, canDelete]
  );

  return (
    <>
      {canDelete && (
        <ConfirmDialog
          open={isDeleteOpen}
          onOpenChange={(open) => {
            if (!open) setProductTypeToDelete(null);
          }}
          // El DELETE es una baja lógica (`activo=False`): el tipo deja de
          // listarse, pero los productos que ya lo tienen lo conservan.
          title="Dar de baja tipo de producto"
          description={`El tipo "${
            deleteSession.snapshot ? getProductTypeLabel(deleteSession.snapshot) : ""
          }" dejará de aparecer en los catálogos y ya no podrá asignarse a productos nuevos. Los productos que ya lo tienen lo conservan. No se puede reactivar desde aquí.`}
          confirmText="Dar de baja"
          onConfirm={() => {
            if (deleteSession.snapshot) deleteProductType(deleteSession.snapshot.id);
            setProductTypeToDelete(null);
          }}
          confirmColor="red"
        />
      )}
      <DataTable
        columns={columns}
        data={productTypes}
        searchPlaceholder="Buscar tipo..."
        isLoading={isLoading}
        isError={isInitialError}
        errorTitle="Error al cargar tipos de producto"
        errorMessage={extractErrorMessage(error, "No se pudo cargar la información.")}
        loadingAriaLabel="Cargando tipos de producto"
        actionButton={
          // El diálogo es DUAL (alta y edición: lo abre `handleEdit` por `open`,
          // sin pasar por el trigger), así que se monta también con solo permiso
          // de edición; lo que se oculta sin `canCreate` es el botón de alta.
          canCreate || canEdit ? (
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
                canCreate ? (
                  <Button
                    variant="primary"
                    rounded="full"
                    onClick={handleNew}
                    className="hover:scale-105 active:scale-95"
                  >
                    + Nuevo Tipo
                  </Button>
                ) : undefined
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
    </>
  );
}
