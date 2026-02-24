import { useQuery } from "@tanstack/react-query";
import { getLocations } from "../services/actions";
import { Location } from "../interfaces/location.interface";

export const useLocations = () => {
  return useQuery<Location[]>({
    queryKey: ["locations"],
    queryFn: getLocations,
  });
};
