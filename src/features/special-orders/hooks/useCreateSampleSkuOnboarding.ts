import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { createSampleSkuOnboarding } from "../services/actions";
import type { SampleSkuOnboardingPayload } from "../interfaces/special-order.interface";
import {
  parseSampleSkuOnboardingError,
  type ParsedSampleSkuOnboardingError,
} from "../utils/parseSampleSkuOnboardingError";

/**
 * Llave de la mutación. La lee `SampleSkuOnboardingDialog` con
 * `useIsMutating` para no dejarse cerrar con el alta en curso.
 */
export const SAMPLE_SKU_ONBOARDING_MUTATION_KEY = ["special-order-sample-sku-onboarding"] as const;

/**
 * Alta de SKU de producción + lista de materiales de una línea de muestra.
 * `onServerError` recibe el error ya normalizado para que el formulario lo
 * reparta entre el aviso del diálogo y los campos.
 *
 * Invalida el detalle del pedido (donde cada talla gana su `sku_produccion` y
 * la línea cambia de "Generar" a "SKU generados") y el listado. Un rechazo por
 * `pedido_detalle_id` también invalida el detalle: significa que la línea que
 * se ve en pantalla ya no es la real.
 */
export const useCreateSampleSkuOnboarding = (
  pedidoId: number,
  onServerError?: (parsed: ParsedSampleSkuOnboardingError) => void,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: SAMPLE_SKU_ONBOARDING_MUTATION_KEY,
    mutationFn: (payload: SampleSkuOnboardingPayload) =>
      createSampleSkuOnboarding(pedidoId, payload),
    onSuccess: (variants) => {
      queryClient.invalidateQueries({ queryKey: ["special-order-detail", pedidoId] });
      queryClient.invalidateQueries({ queryKey: ["special-orders"] });
      const total = variants.length;
      toast.success(
        total === 1
          ? "Se generó 1 SKU de producción con su lista de materiales"
          : `Se generaron ${total} SKU de producción con su lista de materiales`,
      );
    },
    onError: (error) => {
      const parsed = parseSampleSkuOnboardingError(error);
      onServerError?.(parsed);
      if (parsed.staleLine) {
        queryClient.invalidateQueries({ queryKey: ["special-order-detail", pedidoId] });
      }
      toast.error(parsed.toastMessage);
    },
  });
};
