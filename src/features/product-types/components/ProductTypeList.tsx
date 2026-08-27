import { useMemo, useState, useCallback } from "react";
import { DataTable } from "../../../components/DataTable";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { Button } from "../../../components/Button";
import { getColumns } from "./ProductTypeColumns";
import { MainDialog } from "../../../components/MainDialog";
import { DialogHeader } from "@/src/components/DialogHeader";
import { ProductType } from "../interfaces/product-type.interface";
import { useSession } from "next-auth/react";
import { hasPermission } from "@/src/utils/permissions";
import ProductTypeForm from "./ProductTypeForm";
import { useProductTypes } from "../hooks/useProductTypes";

export default function ProductTypeList() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedProductType, setSelectedProductType] = useState<ProductType | null>(null);
  const { productTypes, isLoading, isError, error } = useProductTypes();
  const { data: session } = useSession();
  // `hasPermission` ya cortocircuita para el rol admin, así que sustituye al
  // chequeo manual que vivía aquí. El alta usa su propio código
  // (C-CONFIGURACION), no el de edición.
  const canCreate = hasPermission("C-CONFIGURACION", session?.user);
  const canEdit = hasPermission("E-CONFIGURACION", session?.user);
  const canDelete = hasPermission("D-CONFIGURACION", session?.user);

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
    () => getColumns(handleEdit, { canEdit, canDelete }),
    [handleEdit, canEdit, canDelete]
  );

  return (
    <DataTable
      columns={columns}
      data={productTypes}
      title="Tipos de Producto"
      searchPlaceholder="Buscar tipo..."
      isLoading={isLoading}
      isError={isError}
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
  );
}
