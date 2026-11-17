"use client";

import { DataTable } from "@/src/components/DataTable";
import { useProductsTable } from "@/src/features/products/hooks/useProductsTable";
import { productsTable, withUrlPrefix } from "@/src/features/products/utils/catalogListParams";
import { columns } from "./BomColumns";

/**
 * En Configuración varias tablas en modo servidor comparten `/config` (la
 * vista elegida no va en la URL): el prefijo evita que esta herede la
 * búsqueda o la página que dejó otra. A nivel de módulo: referencia estable.
 */
const MATERIALS_TABLE = withUrlPrefix(productsTable, "mat_");

/**
 * Materiales (`/config`, vista "bom"): los productos de materia prima
 * (`tipo_id=2`). MODO SERVIDOR (EC-897), con la misma definición que las
 * tablas de productos y el tipo fijo: paginación, búsqueda (`q`) y orden los
 * resuelve `GET /catalogo/producto/` y su estado vive en la URL con el
 * prefijo `mat_`, así que `ConfigDetailView` la envuelve en `<Suspense>`.
 */
export default function BomList() {
  const table = useProductsTable({
    tipoId: 2,
    definition: MATERIALS_TABLE,
    toastId: "materials-table-refetch-error",
  });

  return (
    <DataTable
      columns={columns}
      {...table.tableProps}
      // Identidad de la fila por registro, no por posición en la página.
      getRowId={(row) => String(row.id)}
      searchPlaceholder="Buscar por nombre, código o código Proscai..."
      errorTitle="Error al cargar la lista de materiales"
      loadingAriaLabel="Cargando lista de materiales"
    />
  );
}
