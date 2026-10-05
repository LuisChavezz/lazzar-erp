import { useQuery } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { fetchScannerStats } from "../services/actions";
import type { RfidScannerStatsResponse } from "../interfaces/rfid-scanner.interface";

/**
 * Cadencia del polling de `scanner-stats`: cinco veces más lenta que la de
 * `useRfidScans`. Es un dato de diagnóstico (total de renglones y antigüedad de
 * la última lectura), no el flujo en vivo; basta con que no se quede viejo.
 */
export const RFID_SCANNER_STATS_POLL_INTERVAL_MS = 15000;

/**
 * Estado del lector RFID (`GET /wms/etiquetas-rfid/scanner-stats/`).
 * Llave `["rfid-scanner-stats"]`.
 *
 * Se trae al montar y, mientras `polling` esté encendido (el monitoreo de la
 * pantalla), se vuelve a pedir cada 15 s. Sin ese ciclo el total quedaba como
 * una foto del montaje: tras una purga marcaba 0 para siempre y dejaba el botón
 * "Limpiar lecturas" deshabilitado aunque llegaran lecturas que la tabla de un
 * no-superusuario no muestra (ver `fetchRfidScans`).
 *
 * El polling se APAGA en cuanto la consulta falla —un 403 para quien no es
 * administrador, o cualquier otro error— para no repetir cada 15 s una
 * petición que va a seguir fallando. `refetchInterval` se recalcula en cada
 * actualización de la consulta, así que vuelve solo cuando un refetch tiene
 * éxito, y eso únicamente ocurre por los disparadores explícitos: encender el
 * monitoreo, el botón de actualizar o una purga (ver `RfidScannerView` y
 * `useClearRfidScans`). Por lo mismo, un 4xx no se reintenta: con el `retry: 1`
 * global cada 403 costaría dos peticiones.
 *
 * Igual que `useRfidScans`, no sondea con la pestaña oculta.
 *
 * No usa `useHasLoadedQuery`: si esta consulta falla mientras el polling sigue
 * bien, el toast de `useRfidScans` ya cubre el caso, y un segundo aviso por el
 * indicador de estado sería ruido. El fallo se comunica en la propia barra
 * (estado "desconocido"), sin fingir que el lector está caído.
 */
export const useRfidScannerStats = (polling: boolean) => {
  const query = useQuery<RfidScannerStatsResponse>({
    queryKey: ["rfid-scanner-stats"],
    queryFn: fetchScannerStats,
    refetchInterval: (query) =>
      polling && query.state.status !== "error"
        ? RFID_SCANNER_STATS_POLL_INTERVAL_MS
        : false,
    refetchIntervalInBackground: false,
    retry: (failureCount, error) => {
      const status = error instanceof AxiosError ? error.response?.status : undefined;
      if (status !== undefined && status >= 400 && status < 500) return false;
      return failureCount < 1;
    },
  });

  return {
    stats: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    isSuccess: query.isSuccess,
    refetch: query.refetch,
    isFetching: query.isFetching,
  };
};
