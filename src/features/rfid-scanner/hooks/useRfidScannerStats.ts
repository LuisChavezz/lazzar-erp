import { useQuery } from "@tanstack/react-query";
import { retryUnlessClientError } from "@/src/utils/retryUnlessClientError";
import { fetchScannerStats } from "../services/actions";
import type { RfidScannerStatsResponse } from "../interfaces/rfid-scanner.interface";

/**
 * Cadencia del polling de `scanner-stats`: cinco veces más lenta que la de
 * `useRfidScans`. Es un dato de diagnóstico (total de renglones y antigüedad de
 * la última lectura), no el flujo en vivo; basta con que no se quede viejo.
 */
export const RFID_SCANNER_STATS_POLL_INTERVAL_MS = 30000;

/**
 * Estado del lector RFID (`GET /wms/etiquetas-rfid/scanner-stats/`).
 * Llave `["rfid-scanner-stats"]`.
 *
 * `enabled`: el backend solo responde a superusuario o administrador de
 * empresa (403 a cualquier otro), así que quien llama pasa
 * `useIsCompanyAdmin()` y a los demás no se les pide. Deshabilitada, la
 * consulta no carga ni sondea (`stats` indefinido, `isLoading` falso); ojo,
 * `refetch()` sí la forzaría, por eso `RfidScannerView` también lo condiciona.
 *
 * Se trae al montar y, mientras `polling` esté encendido (el monitoreo de la
 * pantalla), se vuelve a pedir cada 30 s. Sin ese ciclo el total quedaba como
 * una foto del montaje: tras una purga marcaba 0 para siempre y dejaba el botón
 * "Limpiar lecturas" deshabilitado aunque siguieran llegando lecturas nuevas a
 * la empresa activa — con el monitoreo detenido la tabla no las trae.
 *
 * El polling se APAGA en cuanto la consulta falla —sea el error que sea— para
 * no repetir cada 30 s una petición que va a seguir fallando. `refetchInterval` se recalcula en cada
 * actualización de la consulta, así que vuelve solo cuando un refetch tiene
 * éxito, y eso únicamente ocurre por los disparadores explícitos: encender el
 * monitoreo, el botón de actualizar o una purga (ver `RfidScannerView` y
 * `useClearRfidScans`). Por lo mismo, un 4xx definitivo no se reintenta
 * (`retryUnlessClientError`; 408 y 429 sí): con el `retry: 1` global cada 403
 * costaría dos peticiones.
 *
 * Igual que `useRfidScans`, no sondea con la pestaña oculta.
 *
 * No usa `useHasLoadedQuery`: si esta consulta falla mientras el polling sigue
 * bien, el toast de `useRfidScans` ya cubre el caso, y un segundo aviso por el
 * indicador de estado sería ruido. El fallo se comunica en la propia barra
 * (estado "desconocido"), sin fingir que el lector está caído.
 */
// Sondea SIEMPRE que esté habilitada (no solo con el escaneo encendido): el
// heartbeat de los lectores (#1289) debe verse al día aunque no se escanee.
export const useRfidScannerStats = (enabled: boolean) => {
  const query = useQuery<RfidScannerStatsResponse>({
    queryKey: ["rfid-scanner-stats"],
    queryFn: fetchScannerStats,
    enabled,
    refetchInterval: (query) =>
      query.state.status !== "error"
        ? RFID_SCANNER_STATS_POLL_INTERVAL_MS
        : false,
    refetchIntervalInBackground: false,
    retry: retryUnlessClientError,
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
