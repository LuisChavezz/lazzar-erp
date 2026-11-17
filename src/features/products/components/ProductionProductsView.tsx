"use client";

import { useSession } from "next-auth/react";
import { DataTable } from "@/src/components/DataTable";
import { hasPermission } from "@/src/utils/permissions";
import { useProductCategories } from "../../product-categories/hooks/useProductCategories";
import ProductOnboardingDialog from "../../product-onboarding/components/ProductOnboardingDialog";
import { useProductsTable } from "../hooks/useProductsTable";
import { buildProductRows, getColumns } from "./ProductColumns";

// Sin acciones por fila: esta vista solo lista y da de alta. La edición y la
// baja siguen viviendo en Configuración (`ProductList`). Con todos los filtros
// de encabezado de Producción. A nivel de módulo: referencia estable.
const READ_ONLY_COLUMNS = getColumns(() => {}, { canEdit: false, canDelete: false }, "all");

/**
 * Gestión de productos del módulo de Producción (`/manufacturing/products`):
 * listado + alta rápida (`product-onboarding`).
 *
 * El listado va SIN filtro de tipo —a diferencia de `ProductList`, que muestra
 * solo `tipo_id=3`—: el alta rápida permite elegir cualquier tipo, y con filtro
 * un producto recién creado de otro tipo no aparecería en la tabla.
 *
 * MODO SERVIDOR (EC-897): paginación, búsqueda (`q`: nombre, código y código
 * Proscai), orden y filtros los resuelve `GET /catalogo/producto/` y su estado
 * vive en la URL (`useProductsTable`), así que la página la envuelve en
 * `<Suspense>`. El listado es solo de activos; las opciones de Categoría
 * salen del catálogo de categorías, nunca de las filas.
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

  const table = useProductsTable({ toastId: "production-products-table-refetch-error" });
  const { categories } = useProductCategories();

  // El nombre y la línea de la categoría se incorporan a la FILA (ver
  // `ProductRow`): la llegada tardía del catálogo produce un `data` nuevo.
  const rows = buildProductRows(table.rows, categories);

  return (
    <div className="h-full flex flex-col min-h-0">
      <DataTable
        columns={READ_ONLY_COLUMNS}
        {...table.tableProps}
        data={rows}
        searchPlaceholder="Buscar por nombre, código o código Proscai..."
        getRowId={(row) => String(row.id)}
        fillHeight
        emptyMessage="No hay productos registrados."
        errorTitle="Error al cargar productos"
        loadingAriaLabel="Cargando productos"
        actionButton={canCreate ? <ProductOnboardingDialog /> : undefined}
      />
    </div>
  );
}
