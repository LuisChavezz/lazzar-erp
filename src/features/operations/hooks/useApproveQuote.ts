"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { approveOrder } from "../services/actions";

export const approveOrderMutationKey = ["approve-quote"] as const;

export const useApproveQuote = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: approveOrderMutationKey,
    mutationFn: (orderId: number) => approveOrder(orderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
      queryClient.invalidateQueries({ queryKey: ["quote"] });
      toast.success("Pedido autorizado correctamente");
    },
    onError: () => {
      toast.error("No se pudo autorizar el pedido");
    },
  });
};
