import { useCallback, useMemo, useState } from "react";
import { DataTable } from "../../../components/DataTable";
import { MainDialog } from "../../../components/MainDialog";
import { DialogHeader } from "../../../components/DialogHeader";
import { getColumns } from "./ProductVariantColumns";
import { useSession } from "next-auth/react";
import ProductVariantForm from "./ProductVariantForm";
import { ProductVariant } from "../interfaces/product-variant.interface";
import { useProducts } from "../../products/hooks/useProducts";
import { useColors } from "../../colors/hooks/useColors";
import { useSizes } from "../../sizes/hooks/useSizes";
import { useProductVariants } from "../hooks/useProductVariants";
import { ErrorState } from "../../../components/ErrorState";

export default function ProductVariantList() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "admin";
  const permissions = session?.user?.permissions ?? [];
  const canEditConfig = isAdmin || permissions.includes("E-CONFIGURACION");
  const canDeleteConfig = isAdmin || permissions.includes("D-CONFIGURACION");
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
    useProducts();
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
    () => getColumns(handleEdit, { canEdit: canEditConfig, canDelete: canDeleteConfig }, lookups),
    [handleEdit, canEditConfig, canDeleteConfig, lookups]
  );
  const isEditing = Boolean(selectedProductVariant?.id);
  const isLoading = isLoadingVariants || isLoadingProducts || isLoadingColors || isLoadingSizes;
  const isError = isErrorVariants || isErrorProducts || isErrorColors || isErrorSizes;
  const error = variantsError || productsError || colorsError || sizesError;

  if (isLoading) {
    return (
      <div className="p-8 flex justify-center items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600"></div>
        <span className="ml-3 text-slate-500">Cargando variantes...</span>
      </div>
    );
  }

  if (isError) {
    return (
      <ErrorState title="Error al cargar variantes" message={(error as Error).message} />
    );
  }

  return (
    <DataTable
      columns={columns}
      data={productVariants}
      title="Variantes de Producto"
      searchPlaceholder="Buscar variante..."
      actionButton={
        canEditConfig ? (
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
              <button
                onClick={handleCreate}
                className="px-4 py-2 cursor-pointer bg-sky-600 hover:bg-sky-700 text-white text-sm font-semibold rounded-full shadow-lg shadow-sky-500/30 transition-all hover:scale-105 active:scale-95 whitespace-nowrap"
              >
                + Nueva Variante
              </button>
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
