"use client";

import { useQuery } from "@tanstack/react-query";
import { getOrderById } from "../services/actions";
import { OrderById } from "../interfaces/order.interface";

export const useOrder = (orderId: number | null | undefined) => {
  return useQuery<OrderById>({
    queryKey: ["order", orderId],
    queryFn: () => getOrderById(orderId!),
    enabled: Number.isFinite(orderId) && Number(orderId) > 0,
  });
};
