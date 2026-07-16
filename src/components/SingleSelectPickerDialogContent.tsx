"use client";

import { useState, type ReactNode } from "react";
import { DialogHeader } from "@/src/components/DialogHeader";
import { Loader } from "@/src/components/Loader";
import { Button } from "@/src/components/Button";
import { SearchableSelectList } from "@/src/components/SearchableSelectList";
import { renderRadioIndicator } from "@/src/components/RadioIndicator";

interface SingleSelectPickerDialogContentProps<T> {
  title: string;
  subtitle: string;
  statusColor?: "sky" | "emerald" | "amber" | "rose" | "indigo" | "violet";
  /** Catálogo a mostrar. Si el consumidor lo carga bajo demanda, debe resolverlo
   *  ANTES de renderizar este componente (este componente no hace fetch). */
  items: T[];
  isLoading?: boolean;
  isError?: boolean;
  loadingTitle?: string;
  loadingMessage?: string;
  errorMessage?: string;
  searchPlaceholder: string;
  filterPredicate: (item: T, term: string) => boolean;
  getKey: (item: T) => string | number;
  /** Ítem actualmente vinculado (para resaltarlo y sembrar la selección
   *  tentativa al abrir). `null` = ninguno. */
  selectedKey: string | number | null;
  emptyMessage: string;
  noResultsMessage?: string;
  renderContent: (item: T) => ReactNode;
  /** Se invoca al pulsar "Confirmar selección" con el ítem tentativo elegido. */
  onConfirm: (item: T) => void;
  onCancel: () => void;
}

/**
 * Cuerpo de un selector único apilado: `DialogHeader` + lista buscable con
 * selección TENTATIVA (no se propaga hasta pulsar "Confirmar selección") +
 * pie Cancelar/Confirmar. Extraído de `StockMovementPedidoSelectorDialog` y
 * `StockTransferProductSelectorDialog`, que reimplementaban exactamente este
 * mismo esqueleto por separado.
 *
 * No incluye el `MainDialog` que lo envuelve ni el gateo de "montar solo
 * mientras `open`": cada selector concreto conserva eso (y, si necesita cargar
 * su propio catálogo bajo demanda como `useOrders()`, el hook que lo hace),
 * porque ese gateo es lo que logra que el fetch sea perezoso — moverlo aquí
 * obligaría a llamar el hook de datos fuera de un componente que se monta
 * condicionalmente, perdiendo esa pereza.
 */
export function SingleSelectPickerDialogContent<T>({
  title,
  subtitle,
  statusColor = "sky",
  items,
  isLoading = false,
  isError = false,
  loadingTitle = "Cargando",
  loadingMessage = "Obteniendo datos disponibles...",
  errorMessage = "Ocurrió un error al cargar los datos.",
  searchPlaceholder,
  filterPredicate,
  getKey,
  selectedKey,
  emptyMessage,
  noResultsMessage = "No se encontraron resultados",
  renderContent,
  onConfirm,
  onCancel,
}: SingleSelectPickerDialogContentProps<T>) {
  // Selección tentativa: no se propaga al formulario hasta confirmar.
  const [tentativeKey, setTentativeKey] = useState<string | number | null>(selectedKey);
  const isConfirmDisabled = tentativeKey === null || isLoading || isError;

  const handleConfirm = () => {
    const item = items.find((i) => getKey(i) === tentativeKey);
    if (!item) return;
    onConfirm(item);
  };

  return (
    <>
      <DialogHeader title={title} subtitle={subtitle} statusColor={statusColor} />

      {isLoading ? (
        <Loader title={loadingTitle} message={loadingMessage} />
      ) : isError ? (
        <p className="text-sm text-red-500 p-4">{errorMessage}</p>
      ) : (
        <SearchableSelectList<T>
          items={items}
          searchPlaceholder={searchPlaceholder}
          filterPredicate={filterPredicate}
          getKey={getKey}
          isSelected={(item) => getKey(item) === tentativeKey}
          onSelect={(item) =>
            setTentativeKey((prev) => (prev === getKey(item) ? null : getKey(item)))
          }
          emptyMessage={emptyMessage}
          noResultsMessage={noResultsMessage}
          renderIndicator={renderRadioIndicator}
          renderContent={renderContent}
        />
      )}

      <div className="flex items-center justify-end gap-3 pt-5">
        <Button variant="secondary" onClick={onCancel}>
          Cancelar
        </Button>
        <Button variant="primary" onClick={handleConfirm} disabled={isConfirmDisabled}>
          Confirmar selección
        </Button>
      </div>
    </>
  );
}
