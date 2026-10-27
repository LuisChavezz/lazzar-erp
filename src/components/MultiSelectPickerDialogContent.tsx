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
}: MultiSelectPickerDialogContentProps<T>) {
  // Selección tentativa: no se propaga al llamador hasta confirmar. Arranca
  // vacía —a diferencia del selector único, que siembra el valor ya vinculado—
  // porque este selector AÑADE al conjunto que el llamador ya tiene, no lo
  // reemplaza.
  const [tentativeKeys, setTentativeKeys] = useState<Set<string | number>>(
    () => new Set(),
  );

  // Lo que CUENTA como seleccionado: con la lista ya cargada, solo las claves
  // que siguen en `items` (una relectura puede quitar un ítem ya marcado, p. ej.
  // porque otra persona lo tomó); sin esto el contador lo seguiría contando y
  // "Confirmar" quedaría habilitado sin nada que confirmar. `items` es la lista
  // COMPLETA —la búsqueda filtra dentro de `SearchableSelectList`—, así que lo
  // marcado y oculto por la búsqueda sigue contando. Es derivado: el conjunto
  // tentativo no se poda, y un ítem que vuelve a la lista vuelve marcado. Con
  // `isLoading`/`isError` la lista se sustituye (hay consumidores que pasan `[]`
  // mientras refrescan) y se usa el conjunto tal cual. El React Compiler lo
  // recalcula solo cuando cambian `items` o la selección, no en cada tecla.
  const listedKeys = new Set(items.map(getKey));
  const selectedKeys =
    isLoading || isError
      ? tentativeKeys
      : new Set([...tentativeKeys].filter((key) => listedKeys.has(key)));

  const selectedCount = selectedKeys.size;
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
