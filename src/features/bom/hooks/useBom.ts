import { useQuery } from "@tanstack/react-query";
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
 */
export const useBom = (productoVarianteId: number) => {
  const {
    data: bom = [],
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery<Bom[]>({
    queryKey: ["bom", productoVarianteId],
    queryFn: () => getBom(productoVarianteId),
    enabled: productoVarianteId > 0,
  });

  return {
    bom,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  };
};
