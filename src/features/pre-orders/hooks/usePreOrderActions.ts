import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { firstDrfFieldMessage } from "@/src/utils/firstDrfFieldMessage";
import {
  cancelarPreOrden,
  confirmarExistencias,
  crearOpDesdePreOrden,
} from "../services/actions";
import type { CrearOpBody } from "../interfaces/pre-order.interface";

const errorText = (error: unknown, fallback: string) =>
  firstDrfFieldMessage(error) ?? extractErrorMessage(error, fallback);

/**
 * Acciones de una pre-orden. Todas refrescan las pre-órdenes y los pedidos
 * especiales (traen `pre_orden`); confirmar también las OC (puede crear una)
 * y crear OP las órdenes de producción. Cada mutación lleva llave por
 * registro: es el candado contra el doble envío (POST no idempotentes).
 */
export const usePreOrderActions = (id: number) => {
  const queryClient = useQueryClient();
  const refresh = (...extra: string[]) =>
    Promise.all(
      ["pre-orders", "special-orders", "special-order-detail", ...extra].map((key) =>
        queryClient.invalidateQueries({ queryKey: [key] }),
      ),
    );

  const confirmar = useMutation({
    mutationKey: ["pre-order-confirmar", id],
    mutationFn: () => confirmarExistencias(id),
    onSuccess: (res) => {
      toast.success(
        res.estatus === "lista"
          ? "Existencias confirmadas. Hay todo el material: ya se puede crear la OP."
          : "Existencias confirmadas. Los faltantes pasaron a compras como necesidades.",
      );
      return refresh("purchase-orders", "purchase-needs");
    },
    onError: (error) =>
      toast.error(errorText(error, "No se pudieron confirmar las existencias.")),
  });

  const crearOp = useMutation({
    mutationKey: ["pre-order-crear-op", id],
    mutationFn: (body: CrearOpBody) => crearOpDesdePreOrden(id, body),
    onSuccess: (res) => {
      toast.success(
        res.folio ? `Orden de producción ${res.folio} creada.` : "Orden de producción creada.",
      );
      return refresh("production-orders");
    },
    onError: (error) =>
      toast.error(errorText(error, "No se pudo crear la orden de producción.")),
  });

  const cancelar = useMutation({
    mutationKey: ["pre-order-cancelar", id],
    mutationFn: () => cancelarPreOrden(id),
    onSuccess: () => {
      toast.success("Pre-orden cancelada.");
      return refresh();
    },
    onError: (error) => toast.error(errorText(error, "No se pudo cancelar la pre-orden.")),
  });

  return { confirmar, crearOp, cancelar };
};
