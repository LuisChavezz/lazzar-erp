import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";
import toast from "react-hot-toast";
import { firstDrfMessage } from "@/src/utils/firstDrfMessage";
import { clearRfidScans } from "../services/actions";
import type { RfidScansResponse } from "../interfaces/rfid-scanner.interface";

/** Mensaje del rechazo por permisos. Coincide con el `PermissionDenied` del
 *  backend, y se usa como respaldo por si el 403 llegara sin cuerpo. */
const FORBIDDEN_MESSAGE = "No tiene permisos para realizar esta acción.";
const GENERIC_MESSAGE = "No se pudieron eliminar las lecturas.";

/**
 * Normaliza el error de la purga. El único rechazo esperado es el 403 de un
 * usuario que no es superusuario ni administrador de empresa, que DRF envía
 * como `{ detail }`; el resto cae en el mensaje genérico.
 */
const parseClearError = (error: unknown): string => {
  if (!(error instanceof AxiosError)) return GENERIC_MESSAGE;

  const data = error.response?.data;
  const detail =
    data && typeof data === "object"
      ? firstDrfMessage((data as Record<string, unknown>).detail)
      : undefined;

  if (error.response?.status === 403) return detail ?? FORBIDDEN_MESSAGE;
  return detail ?? GENERIC_MESSAGE;
};

/**
 * Vacía el buffer de lecturas (`POST /wms/etiquetas-rfid/scans/clear/`).
 *
 * Al confirmarse toca las DOS consultas del módulo: vacía `["rfid-scans"]`
 * escribiendo en su caché —y no solo invalidándola, ver el porqué en
 * `onSuccess`— e invalida `["rfid-scanner-stats"]`, cuyos
 * `total_rfidscan_rows` y `last_scan_seconds_ago` acaban de dejar de ser
 * ciertos; sin eso la barra seguiría anunciando las lecturas recién borradas.
 *
 * SIN actualización optimista, a diferencia de los `useDelete*` de catálogo: el
 * borrado es global e irreversible, así que la tabla se vacía en `onSuccess`,
 * cuando el backend ya confirmó, y nunca en `onMutate`. Emite el toast aquí —y
 * no en el llamador, como hace `useRegisterRfidLabel`— porque el resultado no
 * admite matices: o borró N renglones o fue rechazado.
 */
export const useClearRfidScans = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: clearRfidScans,
    onSuccess: (data) => {
      // Se ESCRIBE el resultado en la caché en vez de solo invalidar, porque
      // con el monitoreo detenido no hay invalidación que valga: `["rfid-scans"]`
      // tiene un observador con `enabled: false`, y `refetchQueries` —al que
      // delega `invalidateQueries`, también con `refetchType: "all"`— descarta
      // las consultas deshabilitadas (`filter(query => !query.isDisabled())` en
      // `queryClient.refetchQueries`). La consulta quedaría marcada como
      // obsoleta pero sin refrescar, y la tabla seguiría mostrando lecturas que
      // ya no existen.
      //
      // No hace falta adivinar el estado resultante: la purga es total, así que
      // después de un 200 no queda ni una lectura. Si nunca cargó (`old`
      // indefinido) se deja intacta, para no convertir una consulta sin datos
      // en una "con datos vacíos".
      queryClient.setQueryData<RfidScansResponse>(["rfid-scans"], (old) =>
        old ? { ...old, scans: [] } : old,
      );
      // DESPUÉS de escribir, nunca antes: `setQueryData` despacha un "success"
      // que limpia el flag `isInvalidated`, así que invalidar primero no dejaría
      // rastro. Con el monitoreo encendido esto dispara el refetch inmediato que
      // confirma contra el servidor; con el monitoreo detenido deja la consulta
      // marcada como obsoleta, de modo que al reanudarlo se pida de nuevo en vez
      // de servir la caché durante los 15 min de `staleTime` global.
      queryClient.invalidateQueries({ queryKey: ["rfid-scans"] });
      // `["rfid-scanner-stats"]` no tiene gate de `enabled`, así que sí está
      // activa y esta invalidación sí la refresca por sí sola.
      queryClient.invalidateQueries({ queryKey: ["rfid-scanner-stats"] });
      toast.success(
        data.deleted === 1
          ? "1 lectura eliminada."
          : `${data.deleted.toLocaleString("es-MX")} lecturas eliminadas.`,
      );
    },
    onError: (error) => {
      toast.error(parseClearError(error));
    },
  });
};
