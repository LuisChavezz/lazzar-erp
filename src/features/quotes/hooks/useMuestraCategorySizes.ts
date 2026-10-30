import { useQueries } from "@tanstack/react-query";
import { getSizesByCategory } from "../../sizes/services/actions";
import type { Size } from "../../sizes/interfaces/size.interface";
import {
  resolveMuestraSizes,
  type MuestraSizesStatus,
} from "../utils/muestraCategorySizes";

/** Tallas de una muestra; `status` no nulo mientras su lista no está lista. */
export interface MuestraSizes {
  sizes: Size[];
  status: MuestraSizesStatus | null;
}

/**
 * Tallas por categoría para las muestras de un diálogo (EC-647). Un diálogo
 * puede capturar varias muestras de categorías distintas, así que se pide una
 * lista por categoría distinta, bajo la MISMA llave que `useSizesByCategory`
 * (`["sizes", "by-category", id]`): comparten caché y las invalidaciones de
 * `["sizes"]` las alcanzan.
 *
 * Devuelve un resolvedor por categoría:
 * - sin categoría (`null` o `<= 0`): el catálogo global, como hasta ahora;
 * - con su lista cargada: la de la categoría, o el global si viene vacía
 *   (`resolveMuestraSizes`, la regla del backend);
 * - mientras carga, o si la primera carga falló: `sizes: []` y un `status`.
 *   NO se ofrece el catálogo global en ese tiempo, porque permitiría elegir
 *   tallas que el backend rechazaría. Un refetch fallido conserva lo cargado.
 */
export function useMuestraCategorySizes(
  categoryIds: readonly (number | null)[],
  globalSizes: Size[],
) {
  const distinctIds = [
    ...new Set(categoryIds.filter((id): id is number => id !== null && id > 0)),
  ];
  const results = useQueries({
    queries: distinctIds.map((categoryId) => ({
      queryKey: ["sizes", "by-category", categoryId],
      queryFn: () => getSizesByCategory(categoryId),
    })),
  });

  return (categoryId: number | null): MuestraSizes => {
    if (categoryId === null || categoryId <= 0) {
      return { sizes: globalSizes, status: null };
    }
    const result = results[distinctIds.indexOf(categoryId)];
    if (result?.data !== undefined) {
      return { sizes: resolveMuestraSizes(result.data, globalSizes), status: null };
    }
    return { sizes: [], status: result?.isError ? "error" : "loading" };
  };
}
