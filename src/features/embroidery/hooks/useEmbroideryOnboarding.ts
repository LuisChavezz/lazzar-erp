import { useQuery } from "@tanstack/react-query";
import { useHasLoadedQuery } from "@/src/hooks/useHasLoadedQuery";
import { getEmbroideryOnboarding } from "../services/actions";
import type { EmbroideryOnboardingData } from "../interfaces/embroidery.interface";

/**
 * Ventana durante la cual la respuesta se considera fresca.
 *
 * NO es 0 con `refetchOnMount: "always"`: eso disparaba un GET completo en cada
 * montaje de CADA paso —incluido el salto Paso 1 → Paso 2, con datos de menos
 * de un segundo—, y la respuesta trae todos los pedidos candidatos con sus
 * líneas, ubicaciones e imágenes. Con esta ventana el salto entre pasos reusa
 * la respuesta recién traída y cualquier estancia normal en el Paso 1 (elegir
 * pedido, prioridad y observaciones lleva más que esto) sí recarga saldos
 * frescos al entrar al Paso 2. Los cinco segundos no relajan la garantía real:
 * el backend revalida el cupo en el POST y el 400 de exceso recarga.
 */
const EMBROIDERY_ONBOARDING_STALE_TIME = 5_000;

/**
 * Catálogos de alta de orden de bordado
 * (`GET /produccion/orden-bordado/onboarding/`). Llave
 * `["embroidery-onboarding"]`.
 *
 * DESVIACIÓN DELIBERADA del `staleTime` global (15 min): la respuesta dejó de
 * ser un catálogo estable. Cada pedido trae ahora su detalle POR TALLA con
 * `cantidad_asignada`/`cantidad_pendiente`, que cualquier otra OB del mismo
 * pedido —de otro operador o de otra pestaña— reduce, y el backend excluye por
 * completo los pedidos que ya no tienen ninguna línea pendiente. Servir eso
 * desde caché por 15 minutos ofrecería saldo que ya no existe, o un pedido que
 * ya se cubrió. Se acota a `EMBROIDERY_ONBOARDING_STALE_TIME` (ver arriba) con
 * un `gcTime` corto, el mismo criterio —aunque no el mismo número— que la
 * llamada con alcance a pedido de `usePickingOnboarding`.
 *
 * `hasLoaded` distingue una carga inicial fallida (mostrar el panel de error)
 * de un refetch fallido con datos en caché, que debe CONSERVAR lo que ya está
 * en pantalla y avisar por toast. Importa especialmente aquí: el 400 de exceso
 * dispara un refetch con el usuario a media captura (ver
 * `useEmbroideryStep2Form`), y sin esta distinción un fallo de red en ese
 * refetch borraría las cantidades capturadas. Mismo patrón que
 * `useEmbroideryOrders`.
 */
export const useEmbroideryOnboarding = () => {
  const query = useQuery<EmbroideryOnboardingData>({
    queryKey: ["embroidery-onboarding"],
    queryFn: getEmbroideryOnboarding,
    staleTime: EMBROIDERY_ONBOARDING_STALE_TIME,
    gcTime: 30_000,
  });

  const { hasLoaded } = useHasLoadedQuery({
    data: query.data,
    isError: query.isError,
    toastId: "embroidery-onboarding-refetch-error",
    errorMessage:
      "No se pudieron actualizar los pendientes del pedido. Mostrando los datos anteriores.",
  });

  return {
    data: query.data,
    pedidos: query.data?.pedidos ?? [],
    operadores: query.data?.operadores ?? [],
    hasLoaded,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    isFetching: query.isFetching,
  };
};
