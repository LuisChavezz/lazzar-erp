"use client";

import { useSearchParams } from "next/navigation";
import { useServerTable } from "@/src/hooks/useServerTable";
import { pageNumberCountAdapter } from "@/src/utils/serverListAdapters";
import { readServerTableState } from "@/src/utils/serverTableParams";
import {
  ROTATION_DEFAULT_ORDERING,
  VARIANT_ONLY_FILTERS,
  VARIANT_ONLY_ORDERING_FIELDS,
  rotationBoardProductTable,
  rotationBoardVariantTable,
} from "../constants/rotationBoardTable";
import type {
  RotationAgrupar,
  RotationBoardResponse,
  RotationBoardRow,
  RotationEstado,
} from "../interfaces/rotation-board.interface";
import { getRotationBoardPage } from "../services/actions";
import { rotationBoardFieldErrorMessage } from "../utils/rotationBoardFormat";

/**
 * Prefijo de las consultas del tablero. La tabla vive en
 * `["rotation-board", "list", params]` y el detalle de un SKU en
 * `["rotation-board", "materials", ...]`.
 */
export const ROTATION_BOARD_KEY = ["rotation-board"] as const;

const rotationBoardAdapter = pageNumberCountAdapter<RotationBoardRow, RotationBoardResponse>();

/** Atajo de las tarjetas: qué filtro (y orden) aplica cada una. */
export type RotationBoardShortcut = Extract<
  RotationEstado,
  "RESURTIR" | "SOBREINVENTARIO" | "LENTO"
> | "CANDIDATOS";

/** Orden que pone el atajo "Resurtir": lo más urgente primero. */
export const RESURTIR_ORDERING = "-resurtido_sugerido";

/**
 * Tablero de rotación en modo servidor. La AGRUPACIÓN elige la definición:
 * se lee de la URL ANTES de llamar a `useServerTable` (las dos definiciones
 * comparten los ajustes, así que cualquiera de las dos la lee igual).
 */
export const useRotationBoardTable = () => {
  const searchParams = useSearchParams();
  const agrupar: RotationAgrupar = readServerTableState(rotationBoardVariantTable, (key) =>
    searchParams.get(key),
  ).settings.agrupar;
  const isProductMode = agrupar === "producto";

  // La de variante es un SUPERCONJUNTO de la de producto (un filtro y dos
  // campos de orden más), así que ambas encajan en el tipo de la de producto.
  const table = useServerTable({
    definition: isProductMode ? rotationBoardProductTable : rotationBoardVariantTable,
    queryKey: ROTATION_BOARD_KEY,
    queryFn: getRotationBoardPage,
    adapter: rotationBoardAdapter,
    toastId: "rotation-board-table-refetch-error",
    refetchErrorMessage:
      "No se pudo actualizar el tablero de rotación. Se muestran los datos anteriores.",
    loadErrorMessage: "No se pudo cargar el tablero de rotación.",
    errorMessageFor: rotationBoardFieldErrorMessage,
  });

  /**
   * Cambia de agrupación en UNA escritura. Al pasar a producto se quitan el
   * filtro y el orden de las columnas que desaparecen (`fabricacion`, `sku`,
   * `fabricable_con_existencia`): quedarían en la URL sin control visible.
   */
  const setAgrupar = (value: RotationAgrupar) =>
    table.setSetting("agrupar", value, {
      clearFilters: value === "producto" ? VARIANT_ONLY_FILTERS : [],
      resetOrderingFields: value === "producto" ? VARIANT_ONLY_ORDERING_FIELDS : [],
    });

  const { estado, solo_candidatos: soloCandidatos } = table.state.filters;
  const activeShortcut: RotationBoardShortcut | null = soloCandidatos
    ? estado === undefined
      ? "CANDIDATOS"
      : null
    : estado === "RESURTIR" || estado === "SOBREINVENTARIO" || estado === "LENTO"
      ? estado
      : null;

  /**
   * Tarjetas: cada una es un atajo EXCLUSIVO (quita el de las otras). Pulsar
   * la activa la apaga. "Resurtir" además ordena por `-resurtido_sugerido`, y
   * al apagarse devuelve el orden por defecto solo si sigue siendo ese.
   */
  const toggleShortcut = (shortcut: RotationBoardShortcut) => {
    const isActive = activeShortcut === shortcut;
    const orderingIsResurtir = table.state.ordering === RESURTIR_ORDERING;
    if (isActive) {
      table.setFilter(shortcut === "CANDIDATOS" ? "solo_candidatos" : "estado", undefined);
      if (shortcut === "RESURTIR" && orderingIsResurtir) table.setOrdering(null);
      return;
    }
    if (shortcut === "CANDIDATOS") {
      table.setFilter("estado", undefined);
      table.setFilter("solo_candidatos", true);
    } else {
      table.setFilter("solo_candidatos", undefined);
      table.setFilter("estado", shortcut);
    }
    if (shortcut === "RESURTIR") table.setOrdering(RESURTIR_ORDERING);
    else if (orderingIsResurtir) table.setOrdering(null);
  };

  return {
    ...table,
    agrupar,
    isProductMode,
    setAgrupar,
    activeShortcut,
    toggleShortcut,
    defaultOrdering: ROTATION_DEFAULT_ORDERING,
  };
};
