import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createReceipt } from "../services/actions";
import type { ReceiptCreatePayload } from "../interfaces/receipt-onboarding.interface";
import toast from "react-hot-toast";
import { toastDrfError } from "@/src/utils/toastDrfError";
import { INVENTORY_PIPELINE_QUERY_KEY } from "@/src/constants/stockQueryKeys";
import { EMBROIDERY_ORDER_DETAIL_KEY } from "@/src/features/embroidery/hooks/useEmbroideryOrderDetail";
import { REFLECTIVE_ORDER_DETAIL_KEY } from "@/src/features/reflective-orders/hooks/useReflectiveOrderDetail";
import { productionOrderOnboardingKey } from "@/src/features/production-orders/hooks/useProductionOrderOnboarding";
import { PURCHASE_ORDER_RECEIPTS_KEY } from "@/src/features/purchase-order-receipts/hooks/usePurchaseOrderReceiptsTable";
import { isSalidaMaquilaRejection } from "../utils/receiptErrors";
import { QUALITY_INSPECTION_ONBOARDING_KEY } from "@/src/features/quality-inspections/hooks/useQualityInspectionOnboarding";

export const useCreateReceipt = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: ReceiptCreatePayload) => createReceipt(payload),
    onSuccess: (_data, payload) => {
      queryClient.invalidateQueries({ queryKey: ["receipts"] });
      queryClient.invalidateQueries({ queryKey: PURCHASE_ORDER_RECEIPTS_KEY });
      queryClient.invalidateQueries({ queryKey: ["receipt-onboarding-data"] });
      // La recepción de OC/OP queda en Calidad: su bandeja la lista.
      queryClient.invalidateQueries({ queryKey: QUALITY_INSPECTION_ONBOARDING_KEY });

      const { recepcion } = payload;
      // La recepción NO toca existencias ni movimientos (eso pasa en Calidad);
      // solo el pipeline, que resta lo recibido de lo pendiente de OC/OP
      // (`reporte-existencias-produccion-compras`). Sin renglones (SM de OB/OR)
      // no cambia nada ahí.
      if (payload.detalle.length > 0) {
        queryClient.invalidateQueries({ queryKey: INVENTORY_PIPELINE_QUERY_KEY });
      }
      if ("orden_compra" in recepcion) {
        // La recepción cambia el estatus de la OC (parcial/recibida): listado,
        // detalle e historial por proveedor cuelgan de este prefijo.
        queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      }
      if ("orden_produccion" in recepcion) {
        // El estatus de la OP (y su detalle) se mueve con lo recibido.
        queryClient.invalidateQueries({ queryKey: ["production-orders"] });
        queryClient.invalidateQueries({
          queryKey: productionOrderOnboardingKey(recepcion.orden_produccion),
        });
      }
      if ("salida_maquila" in recepcion && recepcion.salida_maquila !== undefined) {
        // EC-912: la SM queda Recibida (listado, detalle y las secciones SM de
        // la OP/OB/OR cuelgan de este prefijo) y nace su factura de maquila
        // en Borrador para CxP.
        queryClient.invalidateQueries({ queryKey: ["salidas-maquila"] });
        queryClient.invalidateQueries({ queryKey: ["facturas-proveedor"] });
        if (!("orden_produccion" in recepcion)) {
          // SM de OB/OR: el onboarding no dice cuál orden; se refrescan los
          // detalles de OB/OR que estén abiertos.
          queryClient.invalidateQueries({ queryKey: EMBROIDERY_ORDER_DETAIL_KEY });
          queryClient.invalidateQueries({ queryKey: REFLECTIVE_ORDER_DETAIL_KEY });
        }
      }
      toast.success("Recepción registrada correctamente");
    },
    // El 400 de `salida_maquila` llega como string plano (no lista):
    // `firstNestedDrfMessage` lo toma igual.
    onError: (error) => {
      toastDrfError(error, "Error al registrar la recepción");
      // La SM pudo recibirse o cancelarse en otra parte: el selector vuelve a
      // pedir las pendientes para que deje de ofrecerla (el formulario regresa
      // al paso 1, ver `useReceiptForm`).
      if (isSalidaMaquilaRejection(error)) {
        queryClient.invalidateQueries({ queryKey: ["receipt-onboarding-data"] });
      }
    },
  });
};
