"use client";

import { useSearchParams } from "next/navigation";
import { useServerTable } from "@/src/hooks/useServerTable";
import { pageNumberCountAdapter } from "@/src/utils/serverListAdapters";
import {
  VARIANT_ONLY_FILTERS,
  VARIANT_ONLY_ORDERING_FIELDS,
  readRotationAgrupar,
  rotationBoardProductTable,
  rotationBoardVariantTable,
} from "../constants/rotationBoardTable";
import type {
  RotationAgrupar,
  RotationBoardResponse,
  RotationBoardRow,
} from "../interfaces/rotation-board.interface";
import { getRotationBoardPage } from "../services/actions";
import { rotationBoardFieldErrorMessage } from "../utils/rotationBoardFormat";
import {
  RESURTIR_ORDERING,
  isRotationShortcutActive,
  type RotationBoardShortcut,
} from "../utils/rotationBoardShortcuts";

/**
 * Prefijo de las consultas del tablero. La tabla vive en
 * `["rotation-board", "list", params]` y el detalle de un SKU en
 * `["rotation-board", "materials", ...]`.
 */
export const ROTATION_BOARD_KEY = ["rotation-board"] as const;

const rotationBoardAdapter = pageNumberCountAdapter<RotationBoardRow, RotationBoardResponse>();

/**
 * Tablero de rotación en modo servidor. La AGRUPACIÓN elige la definición: se
 * lee de la URL (solo su parámetro, con su codec) ANTES de `useServerTable`.
 *
 * En modo producto la URL se mantiene canónica (`canonicalUrl`): las claves que
 * solo existen por variante (`fabricacion`, un orden por `sku` o por
 * `fabricable_con_existencia`) se quitan al entrar a ese modo y también si
 * llegan en un enlace, así que nunca quedan escondidas ni reaparecen al volver
 * a variante o con "Restablecer".
 */
export const useRotationBoardTable = () => {
  const searchParams = useSearchParams();
  const agrupar = readRotationAgrupar((key) => searchParams.get(key));
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
    canonicalUrl: { foreignKeys: isProductMode ? VARIANT_ONLY_FILTERS : [] },
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

  const filters = table.state.filters;

  /**
   * Sucursal del filtro (`null` = todas las del usuario). Vive en la URL como
   * un filtro más: cambiarla vuelve a la página 1, "Limpiar filtros" la quita y
   * sobrevive al cambio de agrupación (existe en los dos modos).
   */
  const sucursal = filters.sucursal ?? null;
  const setSucursal = (value: number | null) => table.setFilter("sucursal", value ?? undefined);

  const isShortcutActive = (shortcut: RotationBoardShortcut) =>
    isRotationShortcutActive(filters, shortcut);

  /**
   * Tarjetas. Pulsar una ACTIVA quita solo su propio filtro (y "Resurtir"
   * devuelve el orden por defecto si sigue siendo el suyo). Pulsar una
   * inactiva la aplica como atajo: quita el filtro de las otras tarjetas y
   * "Resurtir" además ordena por `-resurtido_sugerido`.
   */
  const toggleShortcut = (shortcut: RotationBoardShortcut) => {
    const orderingIsResurtir = table.state.ordering === RESURTIR_ORDERING;
    if (isShortcutActive(shortcut)) {
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
    sucursal,
    setSucursal,
    isShortcutActive,
    toggleShortcut,
  };
};
