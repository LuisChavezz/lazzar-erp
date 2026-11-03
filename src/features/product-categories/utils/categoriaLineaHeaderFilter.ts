import type { HeaderFilterSpec } from "@/src/components/withHeaderFilters";
import { optionsFromConfig } from "@/src/utils/columnFilterOptions";
import { CATEGORIA_LINEA_CONFIG, SIN_LINEA_LABEL } from "../constants/categoriaLinea";

/**
 * Filtro de encabezado (`withHeaderFilters`) de una columna "Línea": todas las
 * líneas del catálogo en su orden y, fijada primero, "Sin línea (materia
 * prima)" para las filas con `linea` vacía. `get` lee el valor CRUDO de la
 * línea (`""` = sin línea), no la etiqueta.
 */
export const categoriaLineaHeaderFilter = <T>(
  get: (row: T) => string | null | undefined,
  /**
   * Etiqueta de un valor que el catálogo de líneas no cubre (p. ej. un
   * marcador de "sin categoría"); sin ella, el valor crudo.
   */
  label?: (row: T) => string | null | undefined,
): HeaderFilterSpec<T> => ({
  type: "options",
  filterLabel: "línea",
  get,
  options: optionsFromConfig(CATEGORIA_LINEA_CONFIG),
  emptyOption: SIN_LINEA_LABEL,
  label,
});
