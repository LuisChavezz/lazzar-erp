"use client";

import { MainDialog } from "@/src/components/MainDialog";
import { SingleSelectPickerDialogContent } from "@/src/components/SingleSelectPickerDialogContent";
import type { Product } from "../interfaces/product.interface";

interface ProductSelectorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Catálogo ya cargado y filtrado por el formulario (una sola fuente, sin doble fetch). */
  products: Product[];
  /** Id actualmente elegido (para resaltarlo al abrir si está en `products`); `0` = ninguno. */
  selectedId: number;
  /** Se invoca al confirmar con el id elegido; el formulario decide qué hacer con él. */
  onSelect: (id: number) => void;
}

/**
 * ProductSelectorDialog
 *
 * Selector único de PRODUCTO (no de variante), APILADO encima del formulario
 * que lo abre. Mismo patrón que `StockTransferProductSelectorDialog`: el
 * formulario es dueño del estado de apertura y le pasa el catálogo; aquí no se
 * hace fetch ni se filtra nada (tipo, `activo`, etc. los decide quien llama).
 *
 * `codigo` es nullable en el modelo aunque `Product` lo declare `string`: se
 * pinta "Sin código" en vez de un hueco, porque sin código el backend no puede
 * generar el SKU de una variante.
 */
export function ProductSelectorDialog({
  open,
  onOpenChange,
  products,
  selectedId,
  onSelect,
}: ProductSelectorDialogProps) {
  // El producto elegido puede NO estar en el catálogo (p. ej. al editar una
  // variante cuyo producto ya está inactivo o es de otro tipo). Sembrarlo como
  // selección tentativa dejaría "Confirmar" habilitado sin nada que confirmar.
  const isSelectedListed = products.some((product) => product.id === selectedId);

  return (
    <MainDialog
      open={open}
      onOpenChange={onOpenChange}
      title=""
      maxWidth="560px"
      showCloseButton={false}
    >
      {/* Se remonta al reabrir para reiniciar la selección tentativa. Sin hook de
          datos propio: el catálogo ya viene cargado por el formulario. */}
      {open && (
        <SingleSelectPickerDialogContent<Product>
          title="Seleccionar Producto"
          subtitle="Elige un producto del catálogo"
          statusColor="sky"
          items={products}
          searchPlaceholder="Buscar producto por nombre o código..."
          filterPredicate={(product, term) =>
            `${product.nombre} ${product.codigo ?? ""}`.toLowerCase().includes(term)
          }
          getKey={(product) => product.id}
          selectedKey={isSelectedListed ? selectedId : null}
          emptyMessage="No hay productos disponibles."
          noResultsMessage="No se encontraron productos"
          renderContent={(product) => (
            <>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
                {product.nombre}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {product.codigo ? (
                  <span className="font-mono">{product.codigo}</span>
                ) : (
                  "Sin código"
                )}
              </p>
            </>
          )}
          onConfirm={(product) => {
            onSelect(product.id);
            onOpenChange(false);
          }}
          onCancel={() => onOpenChange(false)}
        />
      )}
    </MainDialog>
  );
}
