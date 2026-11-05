import { useQuery } from "@tanstack/react-query";
import { LIST_QUERY_GC_TIME } from "@/src/constants/queryCache";
import { getSatInfo } from "../services/actions";
import { SatCatalogsResponse } from "../interfaces/sat-info.interface";

interface UseSatInfoOptions {
  /**
   * `false` deja el observador montado sin pedir nada. Lo usa el detalle 360°
   * del pedido para pedir el catálogo desde el montaje de la página, en
   * paralelo con el pedido, solo en la hoja que lo pinta (EC-768).
   */
  enabled?: boolean;
}

export const useSatInfo = ({ enabled = true }: UseSatInfoOptions = {}) => {
  return useQuery<SatCatalogsResponse>({
    queryKey: ["sat-info"],
    queryFn: getSatInfo,
    staleTime: 1000 * 60 * 60 * 24, // 24 hours
    gcTime: LIST_QUERY_GC_TIME,
    enabled,
  });
};
