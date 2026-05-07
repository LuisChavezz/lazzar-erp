import { useQuery } from "@tanstack/react-query";
import { getOrders } from "../services/actions";
import { Order } from "../interfaces/order.interface";

export const useOrders = () => {
  const {
    data: orders = [],
    isLoading,
    isError,
    error,
  } = useQuery<Order[]>({
    queryKey: ["orders"],
    queryFn: getOrders,
  });

  return {
    orders,
    isLoading,
    isError,
    error,
  };
};

