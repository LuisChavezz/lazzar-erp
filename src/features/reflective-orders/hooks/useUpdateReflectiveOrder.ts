import { useUpdateWorkOrder } from "@/src/hooks/useUpdateWorkOrder";
import { updateReflectiveOrder } from "../services/actions";
import { reflectiveOrderDetailQueryKey } from "./useReflectiveOrderDetail";
import type { UpdateReflectiveOrderPayload } from "../interfaces/reflective-order.interface";

/**
 * Edición parcial de una orden de reflejante
 * (`PATCH /produccion/orden-reflejante/{id}/`). El id se fija al crear el hook;
 * `mutate` recibe solo los campos que cambian (para el estatus, armados por
 * `buildReflectiveStatusPayload`). Invalidación, toasts y errores viven en
 * `useUpdateWorkOrder`, compartido con corte de manga.
 */
export const useUpdateReflectiveOrder = (id: number) =>
  useUpdateWorkOrder<UpdateReflectiveOrderPayload>({
    mutationFn: (data) => updateReflectiveOrder(id, data),
    detailQueryKey: reflectiveOrderDetailQueryKey(id),
    listQueryKey: ["reflective-orders"],
    orderLabel: "orden de reflejante",
    successMessage: "Orden de reflejante actualizada correctamente",
  });
