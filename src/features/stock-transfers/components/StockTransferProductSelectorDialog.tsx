"use client";

import { useState } from "react";
import { MainDialog } from "@/src/components/MainDialog";
import { DialogHeader } from "@/src/components/DialogHeader";
import { Button } from "@/src/components/Button";
import { ServerSearchSelectList } from "@/src/components/ServerSearchSelectList";
import { renderRadioIndicator } from "@/src/components/RadioIndicator";
import { ProductVariantCodeBadges } from "@/src/features/product-variants/components/ProductVariantCodeBadges";
import { useProductSearchField } from "@/src/features/products/hooks/useProductSelector";
import { useProductVariantSearchField } from "@/src/features/product-variants/hooks/useProductVariantSelector";
import type { ItemKind } from "../schemas/stock-transfer.schema";
import {
  productEntityOption,
  variantEntityOption,
  type EntityOption,
} from "../hooks/useStockTransferForm";

interface StockTransferProductSelectorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Modo de la línea que abrió el selector: busca productos o variantes. */
  mode: ItemKind;
  /** Opción ya elegida en la línea (para fijarla arriba al abrir); `null` = ninguna. */
  selected: EntityOption | null;
  /** Se invoca al confirmar con la opción elegida; el formulario la escribe en la línea. */
  onSelect: (option: EntityOption) => void;
}

const MODE_COPY: Record<ItemKind, { title: string; subtitle: string; placeholder: string }> = {
  producto: {
    title: "Seleccionar Producto",
    subtitle: "Elige el producto a trasladar en esta línea",
    placeholder: "Buscar producto por nombre, código o descripción...",
  },
  producto_variante: {
    title: "Seleccionar Variante",
    subtitle: "Elige la variante de producto a trasladar en esta línea",
    placeholder: "Buscar variante por SKU, nombre, código Proscai o SKU de producción...",
  },
};

/**
 * Contenido del selector — se monta solo mientras el diálogo está abierto, así
 * que la búsqueda corre bajo demanda, y solo la del modo de la línea
 * (`producto/selector/` o `producto-variante/selector/`, EC-886, ambos solo
 * activos). La selección es *tentativa* hasta "Confirmar selección", y se
 * guarda la opción ENTERA para que siga fija arriba aunque la búsqueda ya no
 * la traiga.
 */
function SelectorContent({
  mode,
  selected,
  onConfirm,
  onCancel,
}: {
  mode: ItemKind;
  selected: EntityOption | null;
  onConfirm: (option: EntityOption) => void;
  onCancel: () => void;
}) {
  const copy = MODE_COPY[mode];
  const [tentative, setTentative] = useState<EntityOption | null>(selected);
  const productSearch = useProductSearchField({}, { enabled: mode === "producto" });
  const variantSearch = useProductVariantSearchField({}, { enabled: mode === "producto_variante" });
  const active =
    mode === "producto"
      ? { ...productSearch, results: productSearch.products.map(productEntityOption) }
      : { ...variantSearch, results: variantSearch.variants.map(variantEntityOption) };

  return (
    <>
      <DialogHeader title={copy.title} subtitle={copy.subtitle} statusColor="sky" />

      <ServerSearchSelectList<EntityOption>
        search={active.search}
        onSearchChange={active.setSearch}
        searchPlaceholder={copy.placeholder}
        results={active.results}
        pinned={tentative ? [tentative] : []}
        getKey={(option) => option.id}
        isSelected={(option) => option.id === tentative?.id}
        onSelect={(option) => setTentative((prev) => (prev?.id === option.id ? null : option))}
        renderIndicator={renderRadioIndicator}
        renderContent={(option) => (
          <>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
              {option.label}
            </p>
            {(option.sublabel || option.variant) && (
              <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
                {option.sublabel && <span className="min-w-0 truncate">{option.sublabel}</span>}
                {/* Las insignias no dependen del sublabel: se muestran aunque falte. */}
                {option.variant && <ProductVariantCodeBadges variant={option.variant} />}
              </p>
            )}
          </>
        )}
        hasResults={active.hasResults}
        isInitialError={active.isInitialError}
        isSearching={active.isSearching}
        onRetry={() => void active.refetch()}
        total={active.total}
        emptyMessage={
          mode === "producto" ? "No hay productos disponibles." : "No hay variantes disponibles."
        }
        noResultsMessage={
          mode === "producto" ? "No se encontraron productos" : "No se encontraron variantes"
        }
        errorMessage={
          mode === "producto"
            ? "Error al buscar los productos."
            : "Error al buscar las variantes de producto."
        }
      />

      <div className="flex items-center justify-end gap-3 pt-5">
        <Button variant="secondary" onClick={onCancel}>
          Cancelar
        </Button>
        <Button
          variant="primary"
          onClick={() => {
            if (tentative) onConfirm(tentative);
          }}
          disabled={tentative === null}
        >
          Confirmar selección
        </Button>
      </div>
    </>
  );
}

/**
 * StockTransferProductSelectorDialog
 *
 * Selector de producto/variante para una línea del traspaso, APILADO encima del
 * formulario (que permanece montado detrás para no perder el estado de las demás
 * líneas — ver `StockTransferForm`). Mismo patrón de modal apilado + búsqueda en
 * el servidor que `StockMovementPedidoSelectorDialog` (pedido); a diferencia de
 * aquel, es reutilizado por CADA línea: el formulario recuerda qué índice/modo lo
 * abrió y escribe la selección en esa línea concreta al confirmar.
 */
export function StockTransferProductSelectorDialog({
  open,
  onOpenChange,
  mode,
  selected,
  onSelect,
}: StockTransferProductSelectorDialogProps) {
  return (
    <MainDialog open={open} onOpenChange={onOpenChange} title="" maxWidth="520px" showCloseButton={false}>
      {/* Se remonta al abrir para reiniciar la selección tentativa y la búsqueda. */}
      {open && (
        <SelectorContent
          mode={mode}
          selected={selected}
          onConfirm={(option) => {
            onSelect(option);
            onOpenChange(false);
          }}
          onCancel={() => onOpenChange(false)}
        />
      )}
    </MainDialog>
  );
}
