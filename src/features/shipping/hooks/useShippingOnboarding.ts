import { useQuery } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { firstDrfMessage } from "@/src/utils/firstDrfMessage";
import { getShippingOnboarding } from "../services/actions";
import type { ShipmentOnboardingData } from "../interfaces/shipping-onboarding.interface";

/**
 * Onboarding de despacho (`GET /wms/despachos/onboarding/`).
 *
 * - `useShippingOnboarding()` / `useShippingOnboarding(null)` → solo el
 *   catálogo de packings candidatos, para el selector.
 * - `useShippingOnboarding(packingId)` → además el packing elegido y la
 *   elegibilidad de despacho por línea (`ya_despachado` /
 *   `disponible_para_despacho`), para la tabla de líneas.
 *
 * DESVIACIÓN DELIBERADA de los defaults de caché del proyecto (staleTime
 * 15min) — pero SOLO para la llamada con `packingId`: `ya_despachado` es una
 * bandera irreversible que otro operador puede activar desde otra pestaña
 * entre que se carga el formulario y se envía. Para esa llamada se fuerza
 * `staleTime: 0` + `refetchOnMount: "always"` y un `gcTime` corto. Ante el
 * error de "ya fue despachado" el formulario dispara además un `refetch()`
 * manual (ver `useShippingForm`). Mismo patrón que `usePackingOnboarding` /
 * `usePickingOnboarding`.
 *
 * La llamada SIN `packingId` (el catálogo) es un catálogo normal —tan estable
 * como cualquier otro del proyecto—, así que usa el `staleTime` global: un
 * refetch en cada apertura del diálogo no aportaría frescura útil y solo
 * agregaría una petición.
 *
 * El id se normaliza a `null` cuando no es un entero positivo: con `null` la
 * llave y la petición son EXACTAMENTE las del catálogo, así que montar los
 * dos hooks a la vez (catálogo + alcance) mientras no hay packing elegido no
 * dispara dos peticiones, React Query las deduplica.
 */
export const useShippingOnboarding = (packingId?: number | null) => {
  const normalizedPackingId =
    typeof packingId === "number" && Number.isInteger(packingId) && packingId > 0
      ? packingId
      : null;
  const isPackingScoped = normalizedPackingId !== null;

  const query = useQuery<ShipmentOnboardingData>({
    queryKey: ["shipping-onboarding", normalizedPackingId],
    queryFn: () => getShippingOnboarding(normalizedPackingId),
    ...(isPackingScoped
      ? { staleTime: 0, gcTime: 30_000, refetchOnMount: "always" as const }
      : {}),
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    isFetching: query.isFetching,
  };
};

/**
 * Mensaje a mostrar cuando falla la carga del onboarding con alcance a un
 * packing.
 *
 * No se usa `extractErrorMessage` (lee `{ error: string }`) porque este
 * endpoint rechaza con `{"packing": "Packing no encontrado o sin acceso."}` —
 * y con `400`, no `404`, tanto para un id inexistente como para uno fuera del
 * alcance del usuario. Sin este lector, el mensaje útil del backend se
 * perdería y solo se vería el texto de respaldo.
 */
export function shippingOnboardingErrorMessage(error: unknown): string {
  const fallback =
    "Puede que el packing ya no esté disponible o que no tengas acceso a él. Elige otro packing o vuelve a intentarlo.";
  if (!(error instanceof AxiosError)) return fallback;

  const data = error.response?.data;
  if (typeof data === "string" && data.trim().length > 0) return data;
  if (data && typeof data === "object") {
    const record = data as Record<string, unknown>;
    return firstDrfMessage(record.packing) ?? firstDrfMessage(record.detail) ?? fallback;
  }
  return fallback;
}
