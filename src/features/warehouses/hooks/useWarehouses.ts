import { useQuery } from "@tanstack/react-query";
import { getWarehouses } from "../services/actions";
import { Warehouse } from "../interfaces/warehouse.interface";

export const useWarehouses = () => {
  return useQuery<Warehouse[]>({
    queryKey: ["warehouses"],
    queryFn: getWarehouses,
  });
};
