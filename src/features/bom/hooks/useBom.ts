import { useGuardedQuery } from "@/src/hooks/useGuardedQuery";
import { getBom } from "../services/actions";
import { Bom } from "../interfaces/bom.interface";

/**
 * Recupera la lista de materiales (BOM) de una variante de producto desde
 * `GET /produccion/lista-material?producto_variante_id={id}`.
 *
 * La consulta solo se ejecuta cuando `productoVarianteId` es un valor válido
 * (> 0), evitando peticiones mientras no se ha seleccionado una variante.
 *
 * @param productoVarianteId Identificador de la variante de producto.
 *
 * No expone el `isError` crudo: `isInitialError` solo es `true` si la consulta
 * NUNCA cargó; un refetch fallido con datos en caché conserva lo cargado y
 * avisa por toast (`useGuardedQuery`). `error` sigue la misma regla. Mismo
 * contrato que `useProducts`.
 */
export const useBom = (productoVarianteId: number) => {
  const { data, isLoading, isInitialError, error, refetch, isFetching } = useGuardedQuery<Bom[]>(
    {
      queryKey: ["bom", productoVarianteId],
      queryFn: () => getBom(productoVarianteId),
      enabled: productoVarianteId > 0,
    },
    { toastId: "bom-refetch-error" },
  );

  const bom = data ?? [];

  return {
    bom,
    isLoading,
    isInitialError,
    error,
    refetch,
    isFetching,
  };
};
