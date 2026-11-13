"use client";

import { useState, type ReactNode } from "react";
import { DialogHeader } from "@/src/components/DialogHeader";
import { Button } from "@/src/components/Button";
import { ServerSearchSelectList } from "@/src/components/ServerSearchSelectList";
import { renderRadioIndicator } from "@/src/components/RadioIndicator";
import type { DialogHeaderStatusColor } from "@/src/constants/dialogStatusColors";

/** Estado de una búsqueda en el servidor, tal como lo dan los hooks `use…SearchField`. */
export interface ServerPickerSearch<T> {
  search: string;
  setSearch: (value: string) => void;
  /** Coincidencias de la página actual, ya en la forma que pinta el selector. */
  results: T[];
  total: number;
  hasResults: boolean;
  isInitialError: boolean;
  isSearching: boolean;
  refetch: () => unknown;
}

interface ServerSearchPickerDialogContentProps<T> {
  title: string;
  subtitle: string;
  statusColor?: DialogHeaderStatusColor;
  /** Búsqueda del consumidor (su hook corre en el componente que monta este). */
  query: ServerPickerSearch<T>;
  searchPlaceholder: string;
  /**
   * Ítem ya elegido al abrir, o `null`: siembra la selección tentativa y queda
   * fijo arriba aunque la búsqueda no lo traiga. Lo arma el consumidor con lo
   * que sabe del ítem elegido, nunca buscándolo en los resultados.
   */
  initialSelected: T | null;
  getKey: (item: T) => string | number;
  renderContent: (item: T) => ReactNode;
  emptyMessage: string;
  noResultsMessage: string;
  errorMessage: string;
  /** Se invoca al pulsar "Confirmar selección" con el ítem tentativo elegido. */
  onConfirm: (item: T) => void;
  onCancel: () => void;
}

/**
 * Cuerpo de un selector ÚNICO apilado cuya búsqueda corre EN EL SERVIDOR:
 * `DialogHeader` + `ServerSearchSelectList` con la selección TENTATIVA fija
 * arriba + pie Cancelar/Confirmar. Contraparte de
 * `SingleSelectPickerDialogContent`, que filtra en memoria un catálogo
 * precargado.
 *
 * La selección es tentativa: solo se propaga al pulsar "Confirmar selección";
 * pulsar la fila elegida la quita. Se guarda el ítem ENTERO para que siga fijo
 * aunque la búsqueda ya no lo traiga.
 *
 * No incluye el `MainDialog` ni el gateo de "montar solo mientras `open`": el
 * consumidor lo conserva, y con él el hook de búsqueda, para que la consulta
 * solo corra con el diálogo abierto y la selección tentativa se reinicie al
 * reabrir.
 */
export function ServerSearchPickerDialogContent<T>({
  title,
  subtitle,
  statusColor = "sky",
  query,
  searchPlaceholder,
  initialSelected,
  getKey,
  renderContent,
  emptyMessage,
  noResultsMessage,
  errorMessage,
  onConfirm,
  onCancel,
}: ServerSearchPickerDialogContentProps<T>) {
  const [tentative, setTentative] = useState<T | null>(initialSelected);
  const tentativeKey = tentative === null ? null : getKey(tentative);

  return (
    <>
      <DialogHeader title={title} subtitle={subtitle} statusColor={statusColor} />

      <ServerSearchSelectList<T>
        search={query.search}
        onSearchChange={query.setSearch}
        searchPlaceholder={searchPlaceholder}
        results={query.results}
        pinned={tentative === null ? [] : [tentative]}
        getKey={getKey}
        isSelected={(item) => getKey(item) === tentativeKey}
        onSelect={(item) =>
          setTentative((prev) => (prev !== null && getKey(prev) === getKey(item) ? null : item))
        }
        renderIndicator={renderRadioIndicator}
        renderContent={renderContent}
        hasResults={query.hasResults}
        isInitialError={query.isInitialError}
        isSearching={query.isSearching}
        onRetry={() => void query.refetch()}
        total={query.total}
        emptyMessage={emptyMessage}
        noResultsMessage={noResultsMessage}
        errorMessage={errorMessage}
      />

      <div className="flex items-center justify-end gap-3 pt-5">
        <Button variant="secondary" onClick={onCancel}>
          Cancelar
        </Button>
        <Button
          variant="primary"
          onClick={() => {
            if (tentative !== null) onConfirm(tentative);
          }}
          disabled={tentative === null}
        >
          Confirmar selección
        </Button>
      </div>
    </>
  );
}
