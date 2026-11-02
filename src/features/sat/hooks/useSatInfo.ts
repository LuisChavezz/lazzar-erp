import { useQuery } from "@tanstack/react-query";
import { PROCUREMENT_QUERY_GC_TIME } from "@/src/constants/queryCache";
import { getSatInfo } from "../services/actions";
import { SatCatalogsResponse } from "../interfaces/sat-info.interface";

export const useSatInfo = () => {
  return useQuery<SatCatalogsResponse>({
    queryKey: ["sat-info"],
    queryFn: getSatInfo,
    staleTime: 1000 * 60 * 60 * 24, // 24 hours
    gcTime: PROCUREMENT_QUERY_GC_TIME,
  });
};
