"use client";

import { useState, type ReactNode } from "react";
import { DialogHeader } from "@/src/components/DialogHeader";
import { Loader } from "@/src/components/Loader";
import { Button } from "@/src/components/Button";
import { SearchableSelectList } from "@/src/components/SearchableSelectList";
import { CheckIcon } from "@/src/components/Icons";

/**
 * Indicador cuadrado tipo casilla (selección MÚLTIPLE), pareja del
 * `renderRadioIndicator` circular de `RadioIndicator.tsx`. Vive aquí y no allá
 * porque este es su único consumidor: la misma marca ya estaba escrita en línea
 * dentro de `ProductionOrderStep1`, y extraerla a `RadioIndicator.tsx` obligaría
 * a tocar un componente compartido para servir a esta pantalla.
 */
const renderCheckboxIndicator = (selected: boolean) => (
  <span
    className={`shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${
      selected
        ? "border-sky-500 bg-sky-500 text-white"
        : "border-slate-300 dark:border-slate-600"
    }`}
  >
    {selected && <CheckIcon className="w-3.5 h-3.5" />}
  </span>
);

interface MultiSelectPickerDialogContentProps<T> {
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
  emptyMessage: string;
  noResultsMessage?: string;
  renderContent: (item: T) => ReactNode;
  /** Se invoca al pulsar "Confirmar selección" con TODOS los ítems tentativos. */
  onConfirm: (items: T[]) => void;
  onCancel: () => void;
  /** Etiqueta del contador, en singular y plural (p. ej. "cuenta"/"cuentas"). */
  countLabel?: { singular: string; plural: string };
}

/**
 * Cuerpo de un selector MÚLTIPLE apilado: `DialogHeader` + lista buscable con
 * casillas y selección TENTATIVA (no se propaga hasta pulsar "Confirmar
 * selección") + contador + pie Cancelar/Confirmar.
 *
 * Hermano de `SingleSelectPickerDialogContent`, no una evolución suya: aquel
 * mantiene una clave escalar (`tentativeKey`) y confirma UN ítem, y ensancharlo
 * a un conjunto cambiaría el contrato de sus cinco consumidores actuales. Aquí
 * el estado tentativo es un `Set` y `onConfirm` entrega el ARREGLO de objetos
 * completos —no solo sus ids— para que el llamador pueda sembrar cada línea con
 * los datos que ya trae el ítem (p. ej. el `saldo` de una CxP) sin volver a
 * buscarlos.
 *
 * Igual que su hermano, NO incluye el `MainDialog` que lo envuelve ni el gateo
 * de "montar solo mientras `open`": eso queda en cada selector concreto, que es
 * lo que hace perezoso el fetch de su catálogo.
 */
export function MultiSelectPickerDialogContent<T>({
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
  emptyMessage,
  noResultsMessage = "No se encontraron resultados",
  renderContent,
  onConfirm,
  onCancel,
  countLabel = { singular: "seleccionado", plural: "seleccionados" },
}: MultiSelectPickerDialogContentProps<T>) {
  // Selección tentativa: no se propaga al llamador hasta confirmar. Arranca
  // vacía —a diferencia del selector único, que siembra el valor ya vinculado—
  // porque este selector AÑADE al conjunto que el llamador ya tiene, no lo
  // reemplaza.
  const [tentativeKeys, setTentativeKeys] = useState<Set<string | number>>(
    () => new Set(),
  );

  const selectedCount = tentativeKeys.size;
  // `isLoading`/`isError` no hacen falta aquí: ambas ramas sustituyen la lista,
  // así que no hay fila que marcar y el conjunto tentativo sigue vacío.
  const isConfirmDisabled = selectedCount === 0;

  const toggle = (item: T) => {
    const key = getKey(item);
    setTentativeKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const handleConfirm = () => {
    // Se recorre `items` (no el `Set`) para devolverlos en el ORDEN de la lista,
    // no en el orden en que el usuario fue marcando.
    const selected = items.filter((item) => tentativeKeys.has(getKey(item)));
    if (selected.length === 0) return;
    onConfirm(selected);
  };

  return (
    <>
      <DialogHeader title={title} subtitle={subtitle} statusColor={statusColor} />

      {isLoading ? (
        <Loader title={loadingTitle} message={loadingMessage} />
      ) : isError ? (
        <p className="text-sm text-red-500 p-4">{errorMessage}</p>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {selectedCount === 0
              ? "Ninguno seleccionado"
              : `${selectedCount} ${
                  selectedCount === 1 ? countLabel.singular : countLabel.plural
                }`}
          </p>

          <SearchableSelectList<T>
            items={items}
            searchPlaceholder={searchPlaceholder}
            filterPredicate={filterPredicate}
            getKey={getKey}
            isSelected={(item) => tentativeKeys.has(getKey(item))}
            onSelect={toggle}
            emptyMessage={emptyMessage}
            noResultsMessage={noResultsMessage}
            renderIndicator={renderCheckboxIndicator}
            renderContent={renderContent}
          />
        </div>
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
