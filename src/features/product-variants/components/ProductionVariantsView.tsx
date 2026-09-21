"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { DataTable } from "@/src/components/DataTable";
import { Button } from "@/src/components/Button";
import { MainDialog } from "@/src/components/MainDialog";
import { DialogHeader } from "@/src/components/DialogHeader";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { hasPermission } from "@/src/utils/permissions";
import { useProducts } from "../../products/hooks/useProducts";
import { useColors } from "../../colors/hooks/useColors";
import { useSizes } from "../../sizes/hooks/useSizes";
import ProductVariantOnboardingForm from "../../product-variant-onboarding/components/ProductVariantOnboardingForm";
import { useProductVariants } from "../hooks/useProductVariants";
import { getColumns } from "./ProductVariantColumns";

/**
 * Variantes del módulo de Producción (`/manufacturing/product-variants`):
 * listado + alta rápida (`product-variant-onboarding`, SKU generado en el
 * servidor). Mismo patrón que `ProductionProductsView`.
 *
 * La tabla es de solo lectura (sin columna de acciones): la edición y la baja
 * siguen en Configuración (`ProductVariantList`, SKU manual), que no se toca.
 *
 * Los nombres de producto se resuelven contra el catálogo SIN filtro de tipo:
 * hay variantes de productos que no son PT/COMPRAS (p. ej. componentes MP de
 * los BOM) y con el filtro saldrían como `#id`.
 *
 * Ver la página exige `R-PRODUCCION` (regla de prefijo `/manufacturing`) y el
 * alta se gatea con ese mismo código, igual que el alta rápida de productos.
 * `DataTable` se monta siempre y el estado del diálogo vive aquí.
 */
export function ProductionVariantsView() {
  const { data: session } = useSession();
  const canCreate = hasPermission("R-PRODUCCION", session?.user);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);

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

  const lookups = {
    products: new Map(products.map((product) => [product.id, product.nombre])),
    colors: new Map(colors.map((color) => [color.id, color.nombre])),
    sizes: new Map(sizes.map((size) => [size.id, size.nombre])),
  };
  const columns = getColumns(() => {}, { canEdit: false, canDelete: false }, lookups);

  const isLoading = isLoadingVariants || isLoadingProducts || isLoadingColors || isLoadingSizes;
  const isError = isErrorVariants || isErrorProducts || isErrorColors || isErrorSizes;
  const error = variantsError || productsError || colorsError || sizesError;

  return (
    <DataTable
      columns={columns}
      data={productVariants}
      title="Variantes de Producto"
      searchPlaceholder="Buscar variante..."
      getRowId={(row) => String(row.id)}
      emptyMessage="No hay variantes registradas."
      isLoading={isLoading}
      isError={isError}
      errorTitle="Error al cargar variantes"
      errorMessage={extractErrorMessage(error, "No se pudo cargar la información.")}
      loadingAriaLabel="Cargando variantes"
      actionButton={
        canCreate ? (
          // Radix desmonta el contenido al cerrar, así que cada apertura empieza
          // con el formulario vacío.
          <MainDialog
            title={
              <DialogHeader
                title="Alta Rápida de Variante"
                subtitle="SKU generado automáticamente"
                statusColor="emerald"
              />
            }
            open={isOnboardingOpen}
            onOpenChange={setIsOnboardingOpen}
            maxWidth="720px"
            trigger={
              <Button
                variant="primary"
                rounded="full"
                className="hover:scale-105 active:scale-95"
              >
                + Nueva Variante
              </Button>
            }
          >
            <ProductVariantOnboardingForm />
          </MainDialog>
        ) : undefined
      }
    />
  );
}
