import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { firstDrfFieldMessage } from "@/src/utils/firstDrfFieldMessage";
import {
  aceptarPreOrden,
  rechazarPreOrden,
  cancelarPreOrden,
  confirmarExistencias,
  crearOpDesdePreOrden,
} from "../services/actions";
import type { CrearOpBody } from "../interfaces/pre-order.interface";
import { invalidatePedidoProgress } from "@/src/features/orders/hooks/invalidatePedidoProgress";

/**
 * Primer texto dentro de un error anidado de DRF, p. ej. el de `crear-op`:
 * `{orden_produccion_detalle: {"0": {cantidad: ["…"]}}}`. `firstDrfFieldMessage`
 * a propósito no baja a esos niveles.
 */
const deepFirstMessage = (value: unknown, depth = 0): string | undefined => {
  if (typeof value === "string") return value;
  if (depth > 4 || !value || typeof value !== "object") return undefined;
  for (const v of Object.values(value)) {
    const msg = deepFirstMessage(v, depth + 1);
    if (msg) return msg;
  }
  return undefined;
};

const errorText = (error: unknown, fallback: string) =>
  firstDrfFieldMessage(error) ??
  deepFirstMessage((error as { response?: { data?: unknown } })?.response?.data) ??
  extractErrorMessage(error, fallback);

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
      // El pedido 360° resume su pre-orden (`pre_orden`, `documentos/`).
      void invalidatePedidoProgress(queryClient);
      return refresh();
    },
    onError: (error) => toast.error(errorText(error, "No se pudo cancelar la pre-orden.")),
  });

  const aceptar = useMutation({
    mutationKey: ["pre-order-aceptar", id],
    mutationFn: () => aceptarPreOrden(id),
    onSuccess: () => {
      toast.success("Resurtido aceptado. Lo de compra ya pasó a compras; lo fabricado espera a almacén.");
      return refresh("purchase-needs");
    },
    onError: (error) => toast.error(errorText(error, "No se pudo aceptar el resurtido.")),
  });

  const rechazar = useMutation({
    mutationKey: ["pre-order-rechazar", id],
    mutationFn: (motivo: string) => rechazarPreOrden(id, motivo),
    onSuccess: () => {
      toast.success("Resurtido rechazado. Planeación verá el motivo.");
      return refresh();
    },
    onError: (error) => toast.error(errorText(error, "No se pudo rechazar el resurtido.")),
  });

  return { confirmar, crearOp, cancelar, aceptar, rechazar };
};
