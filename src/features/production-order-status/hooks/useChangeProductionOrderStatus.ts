import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  PRODUCTION_ORDER_STATUS_CODE,
  productionOrderStatusEntry,
} from "@/src/features/production-orders/constants/productionOrderStatus";
import { productionOrderOnboardingKey } from "@/src/features/production-orders/hooks/useProductionOrderOnboarding";
import { productionOrderKpisQueryKey } from "@/src/features/production-orders/hooks/useProductionOrderKpis";
import { productionOrderCriticalPathKey } from "@/src/features/production-order-critical-path/hooks/useProductionOrderCriticalPath";
import { changeProductionOrderStatus } from "../services/actions";
import type { ChangeProductionOrderStatusBody } from "../interfaces/production-order-status.interface";
import { staleDataAfterStatusError } from "./productionOrderStatusErrors";
import { productionOrderStatusKey } from "./useProductionOrderStatus";
import { invalidatePedidoProgress } from "@/src/features/orders/hooks/invalidatePedidoProgress";
import { DOCUMENT_AUDIT_QUERY_KEY } from "@/src/features/document-audit/hooks/useDocumentAuditList";
import { invalidateStockQueries } from "@/src/features/stock/utils/invalidateStockQueries";
import { writeProductionOrderStatus } from "../utils/productionOrderStatusCache";

/**
 * POST del cambio de estatus. Sin escritura optimista: los destinos siguientes
 * los calcula el servidor y la respuesta no los trae. Al terminar bien, el
 * estatus que respondió (y, al cancelar, quién, cuándo y por qué) se escribe
 * en el listado y el detalle en caché ANTES de invalidar (EC-927,
 * `writeProductionOrderStatus`).
 *
 * Al terminar bien se invalidan:
 * - el listado de OPs y los indicadores (cuentan por estatus);
 * - el detalle de la OP (badge, `fecha_fin`, y si se ofrece "Recalcular
 *   consumos");
 * - su ruta crítica (su modo de solo lectura depende del estatus);
 * - el propio `estatus/`, para traer las opciones nuevas.
 *
 * Al CANCELAR (EC-948), además: las existencias (el material consumido regresa
 * al almacén con una ENTRADA), la pre-orden (su historial registra "OP
 * cancelada" y su `op_estatus` permite cancelarla) y los pedidos especiales
 * que la resumen, y la bitácora (`→ Cancelado`). El consumo vive en el
 * detalle, que ya se invalida.
 *
 * Un error que dice que la página está vieja relee lo que quedó viejo (ver
 * `staleDataAfterStatusError`): solo el estatus en un 409 con `bloqueos`; el
 * estatus y el detalle en el otro 409 y en el 404. Los mensajes de error no
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
    onSuccess: async (response) => {
      await writeProductionOrderStatus(queryClient, opId, response);
      refreshStatusAndDetail();
      void queryClient.invalidateQueries({ queryKey: ["production-orders"] });
      void queryClient.invalidateQueries({ queryKey: productionOrderKpisQueryKey });
      void queryClient.invalidateQueries({ queryKey: productionOrderCriticalPathKey(opId) });
      void invalidatePedidoProgress(queryClient);
      if (response.estatus_op === PRODUCTION_ORDER_STATUS_CODE.CANCELLED) {
        void invalidateStockQueries(queryClient);
        void queryClient.invalidateQueries({ queryKey: ["pre-orders"] });
        void queryClient.invalidateQueries({ queryKey: ["special-orders"] });
        void queryClient.invalidateQueries({ queryKey: ["special-order-detail"] });
        void queryClient.invalidateQueries({ queryKey: DOCUMENT_AUDIT_QUERY_KEY });
      }
      const { label } = productionOrderStatusEntry(
        response.estatus_op,
        response.estatus_op_display,
      );
      toast.success(`Estatus actualizado a ${label}`);
    },
    onError: (error) => {
      console.error(error);
      const stale = staleDataAfterStatusError(error);
      if (stale === "status") {
        void queryClient.invalidateQueries({ queryKey: productionOrderStatusKey(opId) });
      } else if (stale === "status-and-detail") {
        refreshStatusAndDetail();
      }
    },
  });
};
