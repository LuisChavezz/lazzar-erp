"use client";

import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { createOrderProductDetail } from "../services/actions";
import type { OrderProductDetailCreate } from "../interfaces/order.interface";

export const useCreateOrderProductDetail = () => {
  return useMutation<OrderProductDetailCreate, unknown, OrderProductDetailCreate>({
    mutationFn: (payload) => createOrderProductDetail(payload),
    onError: (error) => {
      console.error("Error creating order product detail", error);
      toast.error("Error al registrar el detalle del producto");
    },
  });
};
