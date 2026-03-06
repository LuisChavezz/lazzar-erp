import { useQuery } from "@tanstack/react-query";
import { getSerieFolios } from "../services/actions";
import { SerieFolio } from "../interfaces/serie-folio.interface";

export const useSerieFolios = () => {
  return useQuery<SerieFolio[]>({
    queryKey: ["series-folios"],
    queryFn: getSerieFolios,
  });
};
