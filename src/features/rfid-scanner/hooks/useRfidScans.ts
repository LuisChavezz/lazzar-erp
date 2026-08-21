import { useQuery } from "@tanstack/react-query";
import { useHasLoadedQuery } from "@/src/hooks/useHasLoadedQuery";
import { fetchRfidScans } from "../services/actions";
import type { RfidScansResponse } from "../interfaces/rfid-scanner.interface";

/**
 * Cadencia del polling. 3 s en vez de los 2 s que sugiere la documentación del
 * backend: cada ciclo relee las 50 lecturas completas y las vuelve a cruzar
 * contra `EtiquetaRFIDDetalle` (una consulta con `select_related` por llamada),
 * y a ojo de operador la diferencia entre 2 y 3 s no se nota.
 */
export const RFID_SCANS_POLL_INTERVAL_MS = 3000;

/**
 * Lecturas del lector RFID en vivo (`GET /wms/etiquetas-rfid/scans/`).
 * Llave `["rfid-scans"]`.
 *
 * Es la ÚNICA consulta de la app que hace polling, y por eso está gateada por
 * `enabled`: sin el interruptor, abrir la pantalla y olvidarla dejaría una
 * petición cada 3 s indefinidamente. `refetchIntervalInBackground: false`
 * (el default, explícito aquí por ser justo el punto delicado) detiene el ciclo
 * mientras la pestaña no está visible y lo reanuda al volver.
 *
 * Con `enabled: false` TanStack no programa el intervalo, pero conserva lo ya
 * cargado en caché: al detener el monitoreo la tabla se congela con las últimas
 * lecturas en pantalla en vez de vaciarse.
 */
export const useRfidScans = (enabled: boolean) => {
  const query = useQuery<RfidScansResponse>({
    queryKey: ["rfid-scans"],
    queryFn: fetchRfidScans,
    enabled,
    refetchInterval: RFID_SCANS_POLL_INTERVAL_MS,
    refetchIntervalInBackground: false,
  });

  const { hasLoaded } = useHasLoadedQuery({
    data: query.data,
    isError: query.isError,
    toastId: "rfid-scans-refetch-error",
    errorMessage:
      "No se pudieron actualizar las lecturas. Mostrando las últimas recibidas.",
  });

  return {
    scans: query.data?.scans ?? [],
    hasLoaded,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    isFetching: query.isFetching,
  };
};
