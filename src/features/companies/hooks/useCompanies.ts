import { useQuery } from "@tanstack/react-query";
import { getCompanies } from "../services/actions";
import { Company } from "../interfaces/company.interface";

export const useCompanies = () => {
  return useQuery<Company[]>({
    queryKey: ["companies"],
    queryFn: getCompanies,
  });
};
