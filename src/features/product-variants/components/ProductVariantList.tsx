import { useCallback, useMemo, useState } from "react";
import { DataTable } from "../../../components/DataTable";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { Button } from "../../../components/Button";
import { MainDialog } from "../../../components/MainDialog";
import { DialogHeader } from "../../../components/DialogHeader";
import { getColumns } from "./ProductVariantColumns";
import { useSession } from "next-auth/react";
import { hasPermission } from "@/src/utils/permissions";
import ProductVariantForm from "./ProductVariantForm";
import { ProductVariant } from "../interfaces/product-variant.interface";
import { useProducts } from "../../products/hooks/useProducts";
import { useColors } from "../../colors/hooks/useColors";
import { useSizes } from "../../sizes/hooks/useSizes";
import { useProductVariants } from "../hooks/useProductVariants";

export default function ProductVariantList() {
  const { data: session } = useSession();
  // `hasPermission` ya cortocircuita para el rol admin, así que sustituye al
  // chequeo manual que vivía aquí. El alta usa su propio código
  // (C-CONFIGURACION), no el de edición.
  const canCreate = hasPermission("C-CONFIGURACION", session?.user);
  const canEdit = hasPermission("E-CONFIGURACION", session?.user);
  const canDelete = hasPermission("D-CONFIGURACION", session?.user);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedProductVariant, setSelectedProductVariant] =
    useState<ProductVariant | null>(null);
  const {
    productVariants,
    isLoading: isLoadingVariants,
    isError: isErrorVariants,
    error: variantsError,
  } = useProductVariants();
  const { products, isLoading: isLoadingProducts, isError: isErrorProducts, error: productsError } =
    useProducts(3);
  const { colors, isLoading: isLoadingColors, isError: isErrorColors, error: colorsError } =
    useColors();
  const { sizes, isLoading: isLoadingSizes, isError: isErrorSizes, error: sizesError } =
    useSizes();

  const handleEdit = useCallback(
    (variant: ProductVariant) => {
      setSelectedProductVariant(variant);
      setIsDialogOpen(true);
    },
    [setSelectedProductVariant]
  );

  const handleCreate = useCallback(() => {
    setSelectedProductVariant(null);
    setIsDialogOpen(true);
  }, [setSelectedProductVariant]);

  const lookups = useMemo(
    () => ({
      products: new Map(products.map((product) => [product.id, product.nombre])),
      colors: new Map(colors.map((color) => [color.id, color.nombre])),
      sizes: new Map(sizes.map((size) => [size.id, size.nombre])),
    }),
    [products, colors, sizes]
  );

  const columns = useMemo(
    () => getColumns(handleEdit, { canEdit, canDelete }, lookups),
    [handleEdit, canEdit, canDelete, lookups]
  );
  const isEditing = Boolean(selectedProductVariant?.id);
  const isLoading = isLoadingVariants || isLoadingProducts || isLoadingColors || isLoadingSizes;
  const isError = isErrorVariants || isErrorProducts || isErrorColors || isErrorSizes;
  const error = variantsError || productsError || colorsError || sizesError;

  return (
    <DataTable
      columns={columns}
      data={productVariants}
      title="Variantes de Producto"
      searchPlaceholder="Buscar variante..."
      isLoading={isLoading}
      isError={isError}
      errorTitle="Error al cargar variantes"
      errorMessage={extractErrorMessage(error, "No se pudo cargar la información.")}
      loadingAriaLabel="Cargando variantes"
      actionButton={
        // El diálogo es DUAL (alta y edición: lo abre `handleEdit` por `open`,
        // sin pasar por el trigger), así que se monta también con solo permiso
        // de edición; lo que se oculta sin `canCreate` es el botón de alta.
        canCreate || canEdit ? (
          <MainDialog
            title={
              <DialogHeader
                title={isEditing ? "Editar Variante" : "Alta de Variante"}
                subtitle={isEditing ? "Edición de registro" : "Registro Nuevo"}
                statusColor="emerald"
              />
            }
            open={isDialogOpen}
            onOpenChange={(open) => {
              if (!open) {
                setSelectedProductVariant(null);
              }
              setIsDialogOpen(open);
            }}
            maxWidth="1000px"
            trigger={
              canCreate ? (
                <Button
                  variant="primary"
                  rounded="full"
                  onClick={handleCreate}
                  className="hover:scale-105 active:scale-95"
                >
                  + Nueva Variante
                </Button>
              ) : undefined
            }
          >
            <ProductVariantForm
              onSuccess={() => setIsDialogOpen(false)}
              productVariantToEdit={selectedProductVariant}
            />
          </MainDialog>
        ) : null
      }
    />
  );
}
