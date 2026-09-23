"use client";

import { useQuery } from "@tanstack/react-query";
import { OrderStockDetail } from "../interfaces/order-stock-detail.interface";
import { getOrderStockDetail } from "../services/actions";

/**
 * Fuera del prefijo `["orders"]` a propósito: las invalidaciones de la lista
 * de pedidos no deben refrescar (ni poner en fetching) este detalle.
 */
export const orderStockDetailQueryKey = (orderId: number | null) =>
  ["order-stock-detail", orderId] as const;

export const useOrderStockDetail = (orderId: number | null) => {
  const { data, isLoading, isError, error } = useQuery<OrderStockDetail[]>({
    queryKey: orderStockDetailQueryKey(orderId),
    queryFn: () => getOrderStockDetail(orderId as number),
    enabled: Boolean(orderId),
    // Existencia en vivo: sin caché. Cada apertura del diálogo (que se monta
    // al abrir) muestra el skeleton y datos frescos, nunca la foto anterior.
    staleTime: 0,
    gcTime: 0,
  });

  return {
    orderStockDetail: data ?? [],
    isLoading,
    isError,
    error,
  };
};
