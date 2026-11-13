"use client";

import { MainDialog } from "@/src/components/MainDialog";
import { ServerSearchPickerDialogContent } from "@/src/components/ServerSearchPickerDialogContent";
import { useProductSearchField } from "../hooks/useProductSelector";
import type { ProductSelectorItem } from "../interfaces/product-selector.interface";

interface ProductSelectorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Tipos de producto que se buscan (`?tipo_id=`). */
  tipoIds: number | readonly number[];
  /**
   * Producto actualmente elegido, o `null`. Se fija arriba aunque la búsqueda
   * no lo traiga, también si ya no es elegible (inactivo o de otro tipo, al
   * editar una variante): lo resuelve el formulario, aquí no se busca.
   */
  selected: ProductSelectorItem | null;
  /** Se invoca al confirmar con el producto elegido; el formulario decide qué hacer con él. */
  onSelect: (product: ProductSelectorItem) => void;
}

/**
 * Contenido del selector — se monta solo mientras el diálogo está abierto,
 * así que la búsqueda (`GET /catalogo/producto/selector/?tipo_id=&q=&limit=`)
 * corre bajo demanda.
 */
function ProductSelectorContent({
  tipoIds,
  selected,
  onConfirm,
  onCancel,
}: {
  tipoIds: number | readonly number[];
  selected: ProductSelectorItem | null;
  onConfirm: (product: ProductSelectorItem) => void;
  onCancel: () => void;
}) {
  const { products, ...search } = useProductSearchField({ tipo_id: tipoIds });

  return (
    <ServerSearchPickerDialogContent<ProductSelectorItem>
      title="Seleccionar Producto"
      subtitle="Elige un producto del catálogo"
      statusColor="sky"
      query={{ ...search, results: products }}
      searchPlaceholder="Buscar producto por nombre, código o descripción..."
      initialSelected={selected}
      getKey={(product) => product.id}
      renderContent={(product) => (
        <>
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
            {product.nombre}
          </p>
          {/* `codigo` es nullable: sin código el backend no puede generar el
              SKU de una variante, así que se dice en vez de dejar un hueco. */}
          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
            {product.codigo ? <span className="font-mono">{product.codigo}</span> : "Sin código"}
            {!product.activo && " · Inactivo"}
          </p>
        </>
      )}
      emptyMessage="No hay productos disponibles."
      noResultsMessage="No se encontraron productos"
      errorMessage="Error al buscar los productos."
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
}

/**
 * ProductSelectorDialog
 *
 * Selector único de PRODUCTO (no de variante), APILADO encima del formulario
 * que lo abre (formulario y onboarding de variante). Busca en el servidor
 * sobre el selector ligero de productos (EC-886) en vez de recibir el
 * catálogo completo cargado: solo trae productos activos de `tipoIds`.
 */
export function ProductSelectorDialog({
  open,
  onOpenChange,
  tipoIds,
  selected,
  onSelect,
}: ProductSelectorDialogProps) {
  return (
    <MainDialog
      open={open}
      onOpenChange={onOpenChange}
      title=""
      maxWidth="560px"
      showCloseButton={false}
    >
      {/* Se remonta al reabrir para reiniciar la selección tentativa. */}
      {open && (
        <ProductSelectorContent
          tipoIds={tipoIds}
          selected={selected}
          onConfirm={(product) => {
            onSelect(product);
            onOpenChange(false);
          }}
          onCancel={() => onOpenChange(false)}
        />
      )}
    </MainDialog>
  );
}
