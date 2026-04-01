"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { rejectOrder } from "../services/actions";

export const rejectOrderMutationKey = ["reject-quote"] as const;

export const useRejectQuote = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: rejectOrderMutationKey,
    mutationFn: (orderId: number) => rejectOrder(orderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
      queryClient.invalidateQueries({ queryKey: ["quote"] });
      toast.success("Pedido rechazado correctamente");
    },
    onError: () => {
      toast.error("No se pudo rechazar el pedido");
    },
  });
};
