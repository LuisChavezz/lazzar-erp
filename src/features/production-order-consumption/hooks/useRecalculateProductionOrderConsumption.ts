import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { invalidateStockQueries } from "@/src/features/stock/utils/invalidateStockQueries";
import { productionOrderOnboardingKey } from "@/src/features/production-orders/hooks/useProductionOrderOnboarding";
import { productionOrderCriticalPathKey } from "@/src/features/production-order-critical-path/hooks/useProductionOrderCriticalPath";
import { recalculateProductionOrderConsumption } from "../services/actions";
import type { RecalculateConsumptionBody } from "../interfaces/production-order-consumption.interface";
import { isRecalculateOpStateError } from "./recalculateConsumptionErrorMessages";

/** El diálogo lo usa (`useIsMutating`) para no cerrarse a media petición. */
export const recalculateConsumptionMutationKey = (opId: number) =>
  ["production-order-consumption-recalculate", opId] as const;

/**
 * POST del recálculo. Sin escritura optimista: el resultado (y si hubo cambios)
 * solo lo sabe el servidor, que lo devuelve en `cambios`.
 *
 * Al terminar bien se invalidan:
 * - el onboarding de la OP (trae el nuevo registro de consumo);
 * - su ruta crítica (el backend guardó ahí `cantidad_real_corte`);
 * - existencias y movimientos: el recálculo saca o regresa material del
 *   almacén, así que toda vista de stock queda vieja (`invalidateStockQueries`).
 *
 * Un 400 `op` (la OP se cerró con la página abierta) refresca el onboarding
 * para que la página muestre el estatus vigente y apague la acción. Los
 * mensajes de error los pinta el diálogo (`handleRecalculateConsumptionError`),
 * no un toast: el de `inventario` nombra producto y cantidades y debe poder
 * leerse con calma junto a la captura.
 */
export const useRecalculateProductionOrderConsumption = (opId: number) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: recalculateConsumptionMutationKey(opId),
    mutationFn: (body: RecalculateConsumptionBody) =>
      recalculateProductionOrderConsumption(opId, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: productionOrderOnboardingKey(opId) });
      void queryClient.invalidateQueries({ queryKey: productionOrderCriticalPathKey(opId) });
      void invalidateStockQueries(queryClient);
      toast.success("Consumos recalculados");
    },
    onError: (error) => {
      console.error(error);
      if (isRecalculateOpStateError(error)) {
        void queryClient.invalidateQueries({ queryKey: productionOrderOnboardingKey(opId) });
      }
    },
  });
};
