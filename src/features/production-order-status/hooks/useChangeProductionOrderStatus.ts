import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { productionOrderStatusEntry } from "@/src/features/production-orders/constants/productionOrderStatus";
import { productionOrderOnboardingKey } from "@/src/features/production-orders/hooks/useProductionOrderOnboarding";
import { productionOrderKpisQueryKey } from "@/src/features/production-orders/hooks/useProductionOrderKpis";
import { productionOrderCriticalPathKey } from "@/src/features/production-order-critical-path/hooks/useProductionOrderCriticalPath";
import { changeProductionOrderStatus } from "../services/actions";
import type { ChangeProductionOrderStatusBody } from "../interfaces/production-order-status.interface";
import { isStaleStatusError } from "./productionOrderStatusErrors";
import { productionOrderStatusKey } from "./useProductionOrderStatus";

/**
 * POST del cambio de estatus. Sin escritura optimista: los destinos siguientes
 * los calcula el servidor y la respuesta no los trae.
 *
 * Al terminar bien se invalidan:
 * - el listado de OPs y los indicadores (cuentan por estatus);
 * - el detalle de la OP (badge, `fecha_fin`, y si se ofrece "Recalcular
 *   consumos");
 * - su ruta crítica (su modo de solo lectura depende del estatus);
 * - el propio `estatus/`, para traer las opciones nuevas.
 *
 * Un error que dice que la página está vieja (409 o 404, ver
 * `isStaleStatusError`) relee el estatus y el detalle. Los mensajes de error no
 * salen de aquí: los muestra quien llamó (`classifyChangeStatusError`), en su
 * diálogo o en un toast si se aplicó directo desde el menú.
 */
export const useChangeProductionOrderStatus = (opId: number) => {
  const queryClient = useQueryClient();

  const refreshStatusAndDetail = () => {
    void queryClient.invalidateQueries({ queryKey: productionOrderStatusKey(opId) });
    void queryClient.invalidateQueries({ queryKey: productionOrderOnboardingKey(opId) });
  };

  return useMutation({
    mutationKey: ["production-order-status-change", opId],
    mutationFn: (body: ChangeProductionOrderStatusBody) => changeProductionOrderStatus(opId, body),
    onSuccess: (response) => {
      refreshStatusAndDetail();
      void queryClient.invalidateQueries({ queryKey: ["production-orders"] });
      void queryClient.invalidateQueries({ queryKey: productionOrderKpisQueryKey });
      void queryClient.invalidateQueries({ queryKey: productionOrderCriticalPathKey(opId) });
      const { label } = productionOrderStatusEntry(
        response.estatus_op,
        response.estatus_op_display,
      );
      toast.success(`Estatus actualizado a ${label}`);
    },
    onError: (error) => {
      console.error(error);
      if (isStaleStatusError(error)) refreshStatusAndDetail();
    },
  });
};
