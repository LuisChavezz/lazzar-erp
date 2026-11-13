"use client";

import { useState } from "react";
import { MainDialog } from "@/src/components/MainDialog";
import { DialogHeader } from "@/src/components/DialogHeader";
import { Button } from "@/src/components/Button";
import { ServerSearchSelectList } from "@/src/components/ServerSearchSelectList";
import { renderRadioIndicator } from "@/src/components/RadioIndicator";
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
 * corre bajo demanda. La selección es *tentativa*: solo se propaga al pulsar
 * "Confirmar selección". Se guarda el producto ENTERO para que siga fijo
 * arriba aunque la búsqueda ya no lo traiga.
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
  const [tentative, setTentative] = useState<ProductSelectorItem | null>(selected);
  const { search, setSearch, isSearching, products, total, hasResults, isInitialError, refetch } =
    useProductSearchField({ tipo_id: tipoIds });

  return (
    <>
      <DialogHeader
        title="Seleccionar Producto"
        subtitle="Elige un producto del catálogo"
        statusColor="sky"
      />

      <ServerSearchSelectList<ProductSelectorItem>
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Buscar producto por nombre, código o descripción..."
        results={products}
        pinned={tentative ? [tentative] : []}
        getKey={(product) => product.id}
        isSelected={(product) => product.id === tentative?.id}
        onSelect={(product) =>
          setTentative((prev) => (prev?.id === product.id ? null : product))
        }
        renderIndicator={renderRadioIndicator}
        renderContent={(product) => (
          <>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
              {product.nombre}
            </p>
            {/* `codigo` es nullable: sin código el backend no puede generar el
                SKU de una variante, así que se dice en vez de dejar un hueco. */}
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
              {product.codigo ? (
                <span className="font-mono">{product.codigo}</span>
              ) : (
                "Sin código"
              )}
              {!product.activo && " · Inactivo"}
            </p>
          </>
        )}
        hasResults={hasResults}
        isInitialError={isInitialError}
        isSearching={isSearching}
        onRetry={() => void refetch()}
        total={total}
        emptyMessage="No hay productos disponibles."
        noResultsMessage="No se encontraron productos"
        errorMessage="Error al buscar los productos."
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
