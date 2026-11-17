import { keepPreviousData } from "@tanstack/react-query";
import { useGuardedQuery } from "@/src/hooks/useGuardedQuery";
import { getDisponibilidad } from "../services/actions";

/**
 * Disponibilidad por variante en una sucursal, para que planeación decida
 * cuánto resurtir. Es una lectura (POST solo por el tamaño de la lista).
 * Conserva lo anterior mientras llega la nueva lista para no parpadear al
 * agregar renglones.
 */
export const useDisponibilidad = (sucursal: number | null, variantes: number[], productos: number[]) => {
  const uniq = (xs: number[]) => [...new Set(xs)].sort((a, b) => a - b);
  const ids = uniq(variantes);
  const prods = uniq(productos);
  const { data, isFetching, isInitialError } = useGuardedQuery(
    {
      queryKey: ["pre-order-disponibilidad", sucursal, ids, prods],
      queryFn: () => getDisponibilidad({ sucursal: sucursal!, variantes: ids, productos: prods }),
      enabled: Boolean(sucursal) && ids.length + prods.length > 0,
      staleTime: 60_000,
      placeholderData: keepPreviousData,
    },
    { toastId: "pre-order-disponibilidad-refetch-error" },
  );
  return {
    porVariante: new Map((data ?? []).filter((d) => d.variante != null).map((d) => [d.variante as number, d])),
    porProducto: new Map(
      (data ?? []).filter((d) => d.variante == null && d.producto != null).map((d) => [d.producto as number, d]),
    ),
    isFetching,
    isInitialError,
  };
};
