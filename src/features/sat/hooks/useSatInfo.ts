import { useQuery } from "@tanstack/react-query";
import { LIST_QUERY_GC_TIME } from "@/src/constants/queryCache";
import { getSatInfo } from "../services/actions";
import { SatCatalogsResponse } from "../interfaces/sat-info.interface";

export const useSatInfo = () => {
  return useQuery<SatCatalogsResponse>({
    queryKey: ["sat-info"],
    queryFn: getSatInfo,
    staleTime: 1000 * 60 * 60 * 24, // 24 hours
    gcTime: LIST_QUERY_GC_TIME,
  });
};
