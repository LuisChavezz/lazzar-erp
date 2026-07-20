import { useMemo, useState, useCallback } from "react";
import { DataTable } from "../../../components/DataTable";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { Button } from "../../../components/Button";
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
  const canEditConfig = isAdmin || permissions.includes("E-CONFIGURACION");
  const canDeleteConfig = isAdmin || permissions.includes("D-CONFIGURACION");

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
              <Button
                variant="primary"
                rounded="full"
                onClick={handleNew}
                className="hover:scale-105 active:scale-95"
              >
                + Nuevo Tipo
              </Button>
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
