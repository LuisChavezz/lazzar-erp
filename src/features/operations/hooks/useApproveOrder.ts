"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { approveOrder } from "../services/actions";

export const approveOrderMutationKey = ["approve-order"] as const;

export const useApproveOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: approveOrderMutationKey,
    mutationFn: (orderId: number) => approveOrder(orderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["order"] });
      toast.success("Pedido autorizado correctamente");
    },
    onError: () => {
      toast.error("No se pudo autorizar el pedido");
    },
  });
};
