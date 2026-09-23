"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { AxiosError } from "axios";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { recomprarPedido } from "../services/actions";
import type { PedidoRecompraResponse } from "../interfaces/pedido-recompra.interface";

/**
 * Mutación de "Recompra". Invalida lo que cuenta cotizaciones (listado y
 * resumen del cliente); el pedido origen no cambia, así que no se toca.
 *
 * El endpoint NO es idempotente: la guarda contra el doble envío vive en quien
 * la dispara (`PedidoDetailContent`), no aquí.
 */
export const useRecomprarPedido = () => {
  const queryClient = useQueryClient();

  return useMutation<PedidoRecompraResponse, unknown, number>({
    mutationFn: (pedidoId) => recomprarPedido(pedidoId),
    onSuccess: ({ cotizacion }) => {
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
      // El detalle del cliente trae `resumen_comercial.total_cotizaciones`.
      // `useCustomer` usa el id de la URL (string) en su queryKey.
      queryClient.invalidateQueries({ queryKey: ["customer", String(cotizacion.cliente)] });
      toast.success("Cotización de recompra creada");
    },
    onError: (error) => {
      let message: string | undefined;
      if (error instanceof AxiosError) {
        const statusCode = error.response?.status;
        // `get_object` acota por empresa y excluye bajas lógicas.
        if (statusCode === 404) {
          message = "El pedido no existe o no pertenece a tu empresa.";
        } else if (statusCode !== undefined && statusCode >= 500) {
          // Un fallo de integridad llega como 500 crudo (HTML), sin `{ error }`.
          message = "No se pudo crear la cotización de recompra. Intenta de nuevo.";
        }
      }
      toast.error(
        message ?? extractErrorMessage(error, "No se pudo crear la cotización de recompra"),
      );
    },
  });
};
