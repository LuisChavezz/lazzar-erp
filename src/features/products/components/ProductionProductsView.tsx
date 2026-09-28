"use client";

import { useSession } from "next-auth/react";
import { DataTable } from "@/src/components/DataTable";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { hasPermission } from "@/src/utils/permissions";
import { useProductCategories } from "../../product-categories/hooks/useProductCategories";
import ProductOnboardingDialog from "../../product-onboarding/components/ProductOnboardingDialog";
import { useProducts } from "../hooks/useProducts";
import { getColumns, type ProductRow } from "./ProductColumns";

// Sin acciones por fila: esta vista solo lista y da de alta. La edición y la
// baja siguen viviendo en Configuración (`ProductList`).
const READ_ONLY_COLUMNS = getColumns(() => {}, { canEdit: false, canDelete: false });

/**
 * Gestión de productos del módulo de Producción (`/manufacturing/products`):
 * listado + alta rápida (`product-onboarding`).
 *
 * El listado va SIN filtro de tipo —a diferencia de `ProductList`, que muestra
 * solo `tipo_id=3`—: el alta rápida permite elegir cualquier tipo, y con filtro
 * un producto recién creado de otro tipo no aparecería en la tabla.
 *
 * Ver la página exige `R-PRODUCCION` (regla de prefijo `/manufacturing` en
 * `routePermissions`). El alta se gatea con ese MISMO código: por decisión de
 * negocio no hay un permiso de creación aparte para productos. `hasPermission`
 * ya cortocircuita para el rol "admin".
 *
 * `DataTable` se monta SIEMPRE y alterna internamente solo su área de datos, así
 * que el toolbar —y el botón de alta— sigue visible durante la carga y el error.
 * El estado del diálogo vive en `ProductOnboardingDialog`, no en una celda.
 */
export function ProductionProductsView() {
  const { data: session } = useSession();
  const canCreate = hasPermission("R-PRODUCCION", session?.user);

  const { products, isLoading, isInitialError, error } = useProducts();
  const { categories } = useProductCategories();

  // El nombre de la categoría se incorpora a la FILA (ver `ProductRow`): así la
  // llegada tardía del catálogo produce un `data` nuevo y TanStack recalcula
  // búsqueda y orden.
  const categoryNames = new Map(categories.map((category) => [category.id, category.nombre]));
  const rows: ProductRow[] = products.map((product) => ({
    ...product,
    categoria_nombre: categoryNames.get(product.categoria_producto) ?? null,
  }));

  return (
    <DataTable
      columns={READ_ONLY_COLUMNS}
      data={rows}
      searchPlaceholder="Buscar producto..."
      getRowId={(row) => String(row.id)}
      emptyMessage="No hay productos registrados."
      isLoading={isLoading}
      isError={isInitialError}
      errorTitle="Error al cargar productos"
      errorMessage={extractErrorMessage(error, "No se pudo cargar la información.")}
      loadingAriaLabel="Cargando productos"
      actionButton={canCreate ? <ProductOnboardingDialog /> : undefined}
    />
  );
}
