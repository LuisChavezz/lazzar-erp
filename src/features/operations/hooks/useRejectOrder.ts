"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { rejectOrder } from "../services/actions";

export const rejectOrderMutationKey = ["reject-order"] as const;

export const useRejectOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: rejectOrderMutationKey,
    mutationFn: (orderId: number) => rejectOrder(orderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["order"] });
      toast.success("Pedido rechazado correctamente");
    },
    onError: () => {
      toast.error("No se pudo rechazar el pedido");
    },
  });
};
