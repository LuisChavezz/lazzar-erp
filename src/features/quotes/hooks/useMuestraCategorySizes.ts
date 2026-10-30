import { useCallback, useEffect, useMemo, useRef } from "react";
import { useQueries, type UseQueryResult } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { markNotified, REFETCH_ERROR_MESSAGE } from "@/src/hooks/useHasLoadedQuery";
import { getSizesByCategory } from "../../sizes/services/actions";
import { sizesByCategoryKey } from "../../sizes/hooks/useSizesByCategory";
import type { Size } from "../../sizes/interfaces/size.interface";
import {
  resolveMuestraSizes,
  type MuestraSizesStatus,
} from "../utils/muestraCategorySizes";

/** Tallas de una muestra; `status` no nulo mientras su lista no está lista. */
export interface MuestraSizes {
  sizes: Size[];
  status: MuestraSizesStatus | null;
  /**
   * `true` si `sizes` es la lista de la categoría; `false` si es el catálogo
   * global (muestra sin categoría, o categoría sin tallas), que no restringe.
   */
  restricted: boolean;
  /** Vuelve a pedir la lista de la categoría (con `status: "error"`). */
  retry: () => void;
}

const TOAST_ID = "muestra-category-sizes-refetch-error";

const NO_RETRY = () => {};

type CategoryResult = Pick<
  UseQueryResult<Size[]>,
  "data" | "isError" | "isFetching" | "errorUpdatedAt" | "refetch"
>;

/**
 * Tallas por categoría para las muestras de un diálogo (EC-647). Un diálogo
 * puede capturar varias muestras de categorías distintas, así que se pide una
 * lista por categoría distinta, bajo la MISMA llave que `useSizesByCategory`
 * (`sizesByCategoryKey`): comparten caché y las invalidaciones de `["sizes"]`
 * las alcanzan.
 *
 * Devuelve un resolvedor por categoría, estable mientras no cambien las
 * respuestas ni el catálogo global (`combine` de TanStack devuelve el mismo
 * Map si ninguna consulta cambió):
 * - sin categoría (`null` o `<= 0`): el catálogo global, como hasta ahora;
 * - con su lista cargada: la de la categoría, o el global si viene vacía
 *   (`resolveMuestraSizes`, la regla del backend);
 * - mientras carga, o si la primera carga falló: `sizes: []` y un `status`.
 *   NO se ofrece el catálogo global en ese tiempo, porque permitiría elegir
 *   tallas que el backend rechazaría.
 *
 * El resolvedor solo conoce las categorías de `categoryIds`: quien lo llama
 * debe pasarle ids sacados de las MISMAS filas, en el mismo render.
 *
 * Mismo contrato de errores que `useGuardedQuery` (CLAUDE.md), que no admite
 * varias consultas: un refetch fallido con la lista ya cargada la conserva y
 * avisa por toast una vez por racha de fallos (`markNotified`, compartido con
 * `useHasLoadedQuery`); solo la carga inicial fallida llega como `status`.
 */
export function useMuestraCategorySizes(
  categoryIds: readonly (number | null)[],
  globalSizes: Size[],
) {
  const distinctIds = [
    ...new Set(categoryIds.filter((id): id is number => id !== null && id > 0)),
  ];
  const idsKey = distinctIds.join(",");

  const combine = useCallback(
    (results: CategoryResult[]) =>
      new Map(
        (idsKey === "" ? [] : idsKey.split(",").map(Number)).map((id, index) => {
          const { data, isError, isFetching, errorUpdatedAt, refetch } = results[index];
          return [id, { data, isError, isFetching, errorUpdatedAt, refetch }] as const;
        })
      ),
    [idsKey]
  );

  const byCategory = useQueries({
    queries: distinctIds.map((categoryId) => ({
      queryKey: sizesByCategoryKey(categoryId),
      queryFn: () => getSizesByCategory(categoryId),
    })),
    combine,
  });

  // Toast de refetch fallido, como `useHasLoadedQuery`: solo fallos ocurridos
  // con el hook montado, con la lista ya cargada, uno por racha y categoría.
  const mountedAtRef = useRef(0);
  const coveredEpisodesRef = useRef(new Set<number>());
  useEffect(() => {
    if (mountedAtRef.current === 0) mountedAtRef.current = Date.now();
    for (const [categoryId, result] of byCategory) {
      if (!result.isError) {
        coveredEpisodesRef.current.delete(categoryId);
        continue;
      }
      if (result.data === undefined || coveredEpisodesRef.current.has(categoryId)) continue;
      if (result.errorUpdatedAt <= mountedAtRef.current) continue;
      coveredEpisodesRef.current.add(categoryId);
      if (markNotified(TOAST_ID, result.errorUpdatedAt)) {
        toast.error(REFETCH_ERROR_MESSAGE, { id: TOAST_ID });
      }
    }
  }, [byCategory]);

  const resolved = useMemo(() => {
    const map = new Map<number, MuestraSizes>();
    for (const [categoryId, result] of byCategory) {
      if (result.data !== undefined) {
        map.set(categoryId, {
          sizes: resolveMuestraSizes(result.data, globalSizes),
          status: null,
          restricted: result.data.length > 0,
          retry: NO_RETRY,
        });
      } else {
        map.set(categoryId, {
          sizes: [],
          // Un reintento en curso tras el fallo se muestra como carga.
          status: result.isError && !result.isFetching ? "error" : "loading",
          restricted: true,
          retry: () => void result.refetch(),
        });
      }
    }
    return map;
  }, [byCategory, globalSizes]);

  return useCallback(
    (categoryId: number | null): MuestraSizes => {
      if (categoryId === null || categoryId <= 0) {
        return { sizes: globalSizes, status: null, restricted: false, retry: NO_RETRY };
      }
      const muestraSizes = resolved.get(categoryId);
      if (muestraSizes) return muestraSizes;
      // Inalcanzable si se respeta el contrato (ids de las mismas filas). No se
      // cae al catálogo global: ofrecería tallas que el backend rechazaría.
      if (process.env.NODE_ENV !== "production") {
        console.error(
          `useMuestraCategorySizes: categoría ${categoryId} no está en categoryIds; nadie la pidió.`
        );
      }
      return { sizes: [], status: "loading", restricted: true, retry: NO_RETRY };
    },
    [resolved, globalSizes]
  );
}
