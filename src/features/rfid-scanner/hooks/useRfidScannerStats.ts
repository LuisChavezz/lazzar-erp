import { useQuery } from "@tanstack/react-query";
import { fetchScannerStats } from "../services/actions";
import type { RfidScannerStatsResponse } from "../interfaces/rfid-scanner.interface";

/**
 * Estado del lector RFID (`GET /wms/etiquetas-rfid/scanner-stats/`).
 * Llave `["rfid-scanner-stats"]`.
 *
 * SIN polling propio, a diferencia de `useRfidScans`: se trae al montar y el
 * llamador lo vuelve a pedir cuando el operador enciende el monitoreo (ver
 * `RfidScannerView`). Es una lectura de diagnóstico —cuenta total de renglones
 * y antigüedad de la última lectura—, no el flujo en vivo; duplicar el ciclo de
 * 3 s solo para ella sería el doble de peticiones por el mismo dato que ya
 * delata el propio listado.
 *
 * No usa `useHasLoadedQuery`: si esta consulta falla mientras el polling sigue
 * bien, el toast de `useRfidScans` ya cubre el caso, y un segundo aviso por el
 * indicador de estado sería ruido. El fallo se comunica en la propia barra
 * (estado "desconocido"), sin fingir que el lector está caído.
 */
export const useRfidScannerStats = () => {
  const query = useQuery<RfidScannerStatsResponse>({
    queryKey: ["rfid-scanner-stats"],
    queryFn: fetchScannerStats,
  });

  return {
    stats: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
    isFetching: query.isFetching,
  };
};
