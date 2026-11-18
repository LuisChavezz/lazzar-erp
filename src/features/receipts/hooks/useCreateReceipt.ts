import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createReceipt } from "../services/actions";
import type { ReceiptCreatePayload } from "../interfaces/receipt-onboarding.interface";
import toast from "react-hot-toast";
import { toastDrfError } from "@/src/utils/toastDrfError";
import { invalidateStockQueries } from "@/src/features/stock/utils/invalidateStockQueries";
import { EMBROIDERY_ORDER_DETAIL_KEY } from "@/src/features/embroidery/hooks/useEmbroideryOrderDetail";
import { QUALITY_INSPECTION_ONBOARDING_KEY } from "@/src/features/quality-inspections/hooks/useQualityInspectionOnboarding";

export const useCreateReceipt = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: ReceiptCreatePayload) => createReceipt(payload),
    onSuccess: (_data, payload) => {
      queryClient.invalidateQueries({ queryKey: ["receipts"] });
      queryClient.invalidateQueries({ queryKey: ["purchase-order-receipts"] });
      queryClient.invalidateQueries({ queryKey: ["receipt-onboarding-data"] });
      // La recepción de OC/OP queda en Calidad: su bandeja la lista.
      queryClient.invalidateQueries({ queryKey: QUALITY_INSPECTION_ONBOARDING_KEY });
      void invalidateStockQueries(queryClient);

      const { recepcion } = payload;
      if ("orden_compra" in recepcion) {
        // La recepción cambia el estatus de la OC (parcial/recibida): listado,
        // detalle e historial por proveedor cuelgan de este prefijo.
        queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      }
      if ("orden_produccion" in recepcion) {
        // El estatus de la OP (y su detalle) se mueve con lo recibido.
        queryClient.invalidateQueries({ queryKey: ["production-orders"] });
        queryClient.invalidateQueries({
          queryKey: ["production-order-onboarding", recepcion.orden_produccion],
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
          queryClient.invalidateQueries({ queryKey: ["reflective-order-detail"] });
        }
      }
      toast.success("Recepción registrada correctamente");
    },
    // El 400 de `salida_maquila` llega como string plano (no lista):
    // `firstNestedDrfMessage` lo toma igual.
    onError: (error, payload) => {
      toastDrfError(error, "Error al registrar la recepción");
      // La SM pudo recibirse o cancelarse en otra parte: el selector vuelve a
      // pedir las pendientes para que deje de ofrecerla.
      if ("salida_maquila" in payload.recepcion) {
        queryClient.invalidateQueries({ queryKey: ["receipt-onboarding-data"] });
      }
    },
  });
};
