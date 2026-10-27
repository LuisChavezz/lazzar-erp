"use client";

import { useState, type ReactNode } from "react";
import { DialogHeader } from "@/src/components/DialogHeader";
import { Loader } from "@/src/components/Loader";
import { Button } from "@/src/components/Button";
import { SearchableSelectList } from "@/src/components/SearchableSelectList";
import { renderCheckboxIndicator } from "@/src/components/CheckboxIndicator";

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
  /**
   * OPCIONAL (apagado por defecto): la selección tentativa queda fija arriba
   * de la lista y visible aunque la búsqueda la excluya (ver
   * `SearchableSelectList.pinSelected`, issue #262).
   */
  pinSelected?: boolean;
  /** Etiqueta del contador, en singular y plural (p. ej. "cuenta"/"cuentas"). */
  countLabel?: { singular: string; plural: string };
  /**
   * OPCIONAL: el llamador está guardando la selección (su `onConfirm` lanzó una
   * petición y el diálogo sigue abierto hasta que responda). Bloquea ambos
   * botones y cambia el texto de "Confirmar selección" por `confirmingText`.
   * Sin él, el pie es el de siempre.
   */
  isConfirming?: boolean;
  confirmingText?: string;
  /**
   * OPCIONAL (apagado por defecto): cuando `items` cambia ya cargado (sin
   * `isLoading`/`isError`), quita de la selección tentativa las claves que ya
   * no están en la lista y conserva el resto. Para un catálogo que se relee
   * con el selector abierto (p. ej. tras un rechazo del backend): sin esto el
   * contador seguiría contando ítems que ya no se ven.
   */
  pruneSelectionToItems?: boolean;
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
  pinSelected = false,
  countLabel = { singular: "seleccionado", plural: "seleccionados" },
  isConfirming = false,
  confirmingText = "Guardando…",
  pruneSelectionToItems = false,
}: MultiSelectPickerDialogContentProps<T>) {
  // Selección tentativa: no se propaga al llamador hasta confirmar. Arranca
  // vacía —a diferencia del selector único, que siembra el valor ya vinculado—
  // porque este selector AÑADE al conjunto que el llamador ya tiene, no lo
  // reemplaza.
  const [tentativeKeys, setTentativeKeys] = useState<Set<string | number>>(
    () => new Set(),
  );

  // Poda al cambiar `items` (ajuste de estado durante el render, sin efecto):
  // solo con la lista ya cargada, para no vaciar la selección mientras un
  // consumidor la sustituye por `[]` al cargar o fallar. Una relectura con los
  // mismos ítems no quita nada. Se compara por CLAVES, no por referencia: un
  // consumidor que filtra en cada render entrega un arreglo nuevo cada vez.
  const itemKeys = items.map(getKey);
  const itemsSignature = itemKeys.join("\u0000");
  const [prunedFor, setPrunedFor] = useState(itemsSignature);
  if (pruneSelectionToItems && itemsSignature !== prunedFor && !isLoading && !isError) {
    setPrunedFor(itemsSignature);
    const present = new Set(itemKeys);
    const kept = [...tentativeKeys].filter((key) => present.has(key));
    if (kept.length !== tentativeKeys.size) setTentativeKeys(new Set(kept));
  }

  const selectedCount = tentativeKeys.size;
  // También con `isLoading`/`isError`, igual que el selector único: ambas ramas
  // sustituyen la lista, pero el conjunto tentativo SOBREVIVE a que `items` se
  // vacíe o se quede viejo (p. ej. un consumidor que trata un refetch en segundo
  // plano como carga). Sin esto, confirmar durante la carga no hace nada —
  // `handleConfirm` no encuentra los ítems— y confirmar tras un refetch fallido
  // propagaría las opciones VIEJAS.
  const isConfirmDisabled = selectedCount === 0 || isLoading || isError || isConfirming;

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
            pinSelected={pinSelected}
          />
        </div>
      )}

      <div className="flex items-center justify-end gap-3 pt-5">
        <Button variant="secondary" onClick={onCancel} disabled={isConfirming}>
          Cancelar
        </Button>
        <Button variant="primary" onClick={handleConfirm} disabled={isConfirmDisabled}>
          {isConfirming ? confirmingText : "Confirmar selección"}
        </Button>
      </div>
    </>
  );
}
