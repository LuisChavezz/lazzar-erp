"use client";

import { useQuery } from "@tanstack/react-query";
import { getOrderProductDetails } from "../services/actions";
import type { OrderProductDetailCreate } from "../interfaces/order.interface";

export const useOrderProductDetails = (pedidoId?: number, isEditMode?: boolean) => {
  const { data, isLoading, error } = useQuery<OrderProductDetailCreate[]>({
    queryKey: ["orderProductDetails", pedidoId, isEditMode],
    queryFn: getOrderProductDetails,
    enabled: Boolean(isEditMode && pedidoId),
  });

  const filteredDetails = data?.filter((detail) => detail.pedido === pedidoId) || [];

  return {
    orderProductDetails: filteredDetails,
    isOrderProductDetailsLoading: isLoading,
    orderProductDetailsError: error,
  };
};
