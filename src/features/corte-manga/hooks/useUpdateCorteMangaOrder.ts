import { useUpdateWorkOrder } from "@/src/hooks/useUpdateWorkOrder";
import { updateCorteMangaOrder } from "../services/actions";
import { corteMangaOrderDetailQueryKey } from "./useCorteMangaOrderDetail";
import type { UpdateCorteMangaOrderPayload } from "../interfaces/corte-manga-order.interface";

/**
 * Edición parcial de una orden de corte de manga
 * (`PATCH /produccion/orden-corte-manga/{id}/`). El id se fija al crear el
 * hook; `mutate` recibe solo los campos que cambian (para el estatus, armados
 * por `buildCorteMangaStatusPayload`). Invalidación, toasts y errores viven en
 * `useUpdateWorkOrder`, compartido con reflejante.
 */
export const useUpdateCorteMangaOrder = (id: number) =>
  useUpdateWorkOrder<UpdateCorteMangaOrderPayload>({
    mutationFn: (data) => updateCorteMangaOrder(id, data),
    detailQueryKey: corteMangaOrderDetailQueryKey(id),
    listQueryKey: ["corte-manga-orders"],
    orderLabel: "orden de corte de manga",
    successMessage: "Orden de corte de manga actualizada correctamente",
  });
