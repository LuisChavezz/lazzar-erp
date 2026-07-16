"use client";

import { MainDialog } from "@/src/components/MainDialog";
import { SingleSelectPickerDialogContent } from "@/src/components/SingleSelectPickerDialogContent";
import type { ItemKind } from "../schemas/stock-transfer.schema";
import type { EntityOption } from "../hooks/useStockTransferForm";

interface StockTransferProductSelectorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Modo de la línea que abrió el selector: busca productos o variantes. */
  mode: ItemKind;
  /** Catálogos ya cargados por el formulario (una sola fuente, sin doble fetch). */
  productOptions: EntityOption[];
  variantOptions: EntityOption[];
  /** Id actualmente elegido en la línea (para resaltarlo al abrir); `0` = ninguno. */
  selectedId: number;
  /** Se invoca al confirmar con el id elegido; el formulario lo escribe en la línea. */
  onSelect: (id: number) => void;
}

const MODE_COPY: Record<ItemKind, { title: string; subtitle: string; placeholder: string }> = {
  producto: {
    title: "Seleccionar Producto",
    subtitle: "Elige el producto a trasladar en esta línea",
    placeholder: "Buscar producto por nombre o código...",
  },
  producto_variante: {
    title: "Seleccionar Variante",
    subtitle: "Elige la variante de producto a trasladar en esta línea",
    placeholder: "Buscar variante por SKU o nombre...",
  },
};

/**
 * StockTransferProductSelectorDialog
 *
 * Selector de producto/variante para una línea del traspaso, APILADO encima del
 * formulario (que permanece montado detrás para no perder el estado de las demás
 * líneas — ver `StockTransferForm`). Mismo patrón de modal apilado + lista
 * buscable que `StockMovementPedidoSelectorDialog` (pedido); a diferencia de
 * aquel, es reutilizado por CADA línea: el formulario recuerda qué índice/modo lo
 * abrió y escribe la selección en esa línea concreta al confirmar.
 *
 * Reemplaza al antiguo dropdown flotante (`EntitySearchSelect`): al delegar el
 * posicionamiento y el foco en Radix, elimina de raíz la clase de errores de
 * cálculo manual de posición + listeners de scroll.
 */
export function StockTransferProductSelectorDialog({
  open,
  onOpenChange,
  mode,
  productOptions,
  variantOptions,
  selectedId,
  onSelect,
}: StockTransferProductSelectorDialogProps) {
  const copy = MODE_COPY[mode];

  return (
    <MainDialog open={open} onOpenChange={onOpenChange} title="" maxWidth="520px" showCloseButton={false}>
      {/* Se remonta al abrir para reiniciar la selección tentativa. Sin hook de
          datos propio (los catálogos ya vienen cargados por el formulario), así
          que se renderiza directamente — sin un componente de contenido intermedio. */}
      {open && (
        <SingleSelectPickerDialogContent<EntityOption>
          title={copy.title}
          subtitle={copy.subtitle}
          statusColor="sky"
          items={mode === "producto" ? productOptions : variantOptions}
          searchPlaceholder={copy.placeholder}
          filterPredicate={(option, term) =>
            `${option.label} ${option.sublabel ?? ""}`.toLowerCase().includes(term)
          }
          getKey={(option) => option.id}
          selectedKey={selectedId > 0 ? selectedId : null}
          emptyMessage={
            mode === "producto"
              ? "No hay productos disponibles."
              : "No hay variantes disponibles."
          }
          renderContent={(option) => (
            <>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
                {option.label}
              </p>
              {option.sublabel && (
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  {option.sublabel}
                </p>
              )}
            </>
          )}
          onConfirm={(option) => {
            onSelect(option.id);
            onOpenChange(false);
          }}
          onCancel={() => onOpenChange(false)}
        />
      )}
    </MainDialog>
  );
}
