"use client";

import { canCreateProducts } from "@/src/utils/productionPermissions";
import { useSession } from "next-auth/react";
import { DataTable } from "@/src/components/DataTable";
import ProductOnboardingDialog from "../../product-onboarding/components/ProductOnboardingDialog";
import { useProductsTable } from "../hooks/useProductsTable";
import { getColumns } from "./ProductColumns";

// Sin acciones por fila: esta vista solo lista y da de alta. La edición y la
// baja siguen viviendo en Configuración (`ProductList`). Con todos los filtros
// de encabezado de Producción. A nivel de módulo: referencia estable.
const READ_ONLY_COLUMNS = getColumns(null, { canEdit: false, canDelete: false }, "all");

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
 * `<Suspense>`. El listado es solo de activos. Categoría y Línea se pintan con
 * lo que trae cada fila (EC-905); las opciones del filtro de Categoría salen
 * del catálogo de categorías, nunca de las filas.
 *
 * Ver la página exige `R-PRODUCCION` (regla de prefijo `/manufacturing` en
 * `routePermissions`). El alta solo la hace producción, quien crea OP
 * (`C-PRODUCCION-OP`) o configuración (`C-CONFIGURACION`), como exige el backend.
 *
 * `DataTable` se monta SIEMPRE y alterna internamente solo su área de datos, así
 * que el toolbar —y el botón de alta— sigue visible durante la carga y el error.
 * El estado del diálogo vive en `ProductOnboardingDialog`, no en una celda.
 */
export function ProductionProductsView() {
  const { data: session } = useSession();
  // Misma regla que el backend: C-PRODUCCION-OP o C-CONFIGURACION.
  const canCreate = canCreateProducts(session?.user);

  const table = useProductsTable({ toastId: "production-products-table-refetch-error" });

  return (
    <div className="h-full flex flex-col min-h-0">
      <DataTable
        columns={READ_ONLY_COLUMNS}
        {...table.tableProps}
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
