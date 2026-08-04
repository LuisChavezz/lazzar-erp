import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { getRfidLabelOnboarding } from "../services/actions";
import type {
  RfidOnboardingParams,
  RfidOnboardingResponse,
} from "../interfaces/rfid-onboarding.interface";

/**
 * Onboarding de impresión de etiquetas RFID (`GET /wms/etiquetas-rfid/onboarding/`).
 * Un solo endpoint sirve las dos fases del flujo:
 *
 *  - Búsqueda (`{ q }`): el `q` DEBE venir ya debounced desde el consumidor.
 *    `keepPreviousData` conserva los resultados anteriores mientras llega la
 *    siguiente búsqueda, evitando el parpadeo del listado al teclear.
 *  - Preview (`{ variante | producto, cantidad, rfid_mode }`): devuelve
 *    `preview.zpl_individual[]` con los EPCs YA generados. Cambiar
 *    cantidad/rfid_mode cambia la llave y trae un preview nuevo (con EPCs
 *    nuevos) — es el comportamiento deseado. Dentro de la misma llave el
 *    resultado es estable (no se re-fetchea por foco, default del proyecto), de
 *    modo que los EPCs que se muestran e imprimen son los mismos que luego se
 *    registran.
 *
 * La llave incluye todos los params porque cada uno cambia la respuesta.
 */
export const useRfidLabelOnboarding = (params: RfidOnboardingParams) => {
  const { q = "", variante = null, producto = null, cantidad, rfid_mode } = params;

  const query = useQuery<RfidOnboardingResponse>({
    queryKey: [
      "etiquetas-rfid-onboarding",
      q,
      variante,
      producto,
      cantidad ?? null,
      rfid_mode ?? null,
    ],
    queryFn: () => getRfidLabelOnboarding(params),
    placeholderData: keepPreviousData,
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
};
