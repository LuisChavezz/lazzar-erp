"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { DataTable } from "@/src/components/DataTable";
import { Button } from "@/src/components/Button";
import { MainDialog } from "@/src/components/MainDialog";
import { DialogHeader } from "@/src/components/DialogHeader";
import { hasPermission } from "@/src/utils/permissions";
import ProductVariantOnboardingForm from "../../product-variant-onboarding/components/ProductVariantOnboardingForm";
import { useProductVariantsTable } from "../hooks/useProductVariantsTable";
import { getColumns } from "./ProductVariantColumns";

// Sin acciones por fila y con los filtros de encabezado de Producción. A nivel
// de módulo: una referencia estable entre renders.
const COLUMNS = getColumns(null, { canEdit: false, canDelete: false }, { withHeaderFilters: true });

/**
 * Variantes del módulo de Producción (`/manufacturing/product-variants`):
 * listado + alta rápida (`product-variant-onboarding`, SKU generado en el
 * servidor). Mismo patrón que `ProductionProductsView`.
 *
 * MODO SERVIDOR (EC-897): paginación, búsqueda (`q`), orden y filtros los
 * resuelve `GET /catalogo/producto-variante/` y su estado vive en la URL
 * (`useProductVariantsTable`), así que la página la envuelve en `<Suspense>`.
 * Las opciones de los filtros salen de catálogos (colores, tallas) o de la
 * búsqueda de productos en el servidor, nunca de las filas.
 *
 * La tabla es de solo lectura (sin columna de acciones): la edición y la baja
 * siguen en Configuración (`ProductVariantList`, SKU manual), que comparte con
 * esta vista las columnas de `getColumns`.
 *
 * Producto, color y talla se pintan con los nombres que ya trae cada fila
 * (`producto_nombre`, `color_nombre`, `talla_nombre`): no se piden los
 * catálogos de productos, colores ni tallas solo para traducir ids (EC-888).
 * El alta rápida carga sus propios catálogos al abrir su diálogo.
 *
 * Ver la página exige `R-PRODUCCION` (regla de prefijo `/manufacturing`) y el
 * alta se gatea con ese mismo código, igual que el alta rápida de productos.
 * `DataTable` se monta siempre y el estado del diálogo vive aquí.
 */
export function ProductionVariantsView() {
  const { data: session } = useSession();
  const canCreate = hasPermission("R-PRODUCCION", session?.user);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);

  const table = useProductVariantsTable({ toastId: "production-variants-table-refetch-error" });

  return (
    <div className="h-full flex flex-col min-h-0">
    <DataTable
      columns={COLUMNS}
      {...table.tableProps}
      searchPlaceholder="Buscar por SKU, nombre o producto..."
      getRowId={(row) => String(row.id)}
      fillHeight
      emptyMessage="No hay variantes registradas."
      errorTitle="Error al cargar variantes"
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
            maxWidth="640px"
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
    </div>
  );
}
