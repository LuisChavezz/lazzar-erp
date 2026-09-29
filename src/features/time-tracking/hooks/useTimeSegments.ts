import { useQuery } from "@tanstack/react-query";
import { useHasLoadedQuery } from "@/src/hooks/useHasLoadedQuery";
import { getTimeSegments } from "../services/actions";
import type { TimeSegment, TimeSegmentListParams } from "../interfaces/time-tracking.interface";
import { parseInstant } from "../utils/segmentTime";

/**
 * Raíz de la llave del recurso. Toda escritura del módulo invalida por aquí.
 * NO cuelga de `["attendance"]`: las invalidaciones de asistencia no tienen
 * por qué recargar los tramos, y cancelar consultas de un recurso no debe
 * alcanzar al otro.
 */
export const TIME_TRACKING_KEY_ROOT = ["time-tracking"] as const;

/** Por inicio ascendente; un inicio que no parsea, al final. */
const byStart = (a: TimeSegment, b: TimeSegment) =>
  (parseInstant(a.hora_inicio) ?? Infinity) - (parseInstant(b.hora_inicio) ?? Infinity) ||
  a.id - b.id;

/**
 * Tramos de UNA asistencia. El backend no filtra por `asistencia`, así que se
 * piden por `empleado` + `fecha` (únicos en asistencias) y se conservan los que
 * apuntan a ESTE registro: el backend tampoco garantiza coherencia entre esos
 * tres campos.
 *
 * `staleTime: 0`: los traslapes se validan contra este listado, así que cada
 * apertura del desglose lo vuelve a pedir (mientras tanto se ve el de caché).
 *
 * `isInitialError` solo es `true` si nunca cargó; un refetch fallido conserva
 * lo cargado y avisa por toast (`useHasLoadedQuery`).
 */
export const useTimeSegments = (attendance: { id: number; empleado: number; fecha: string }) => {
  const params: TimeSegmentListParams = { empleado: attendance.empleado, fecha: attendance.fecha };

  const { data, isLoading, isError, error, errorUpdatedAt, refetch, isFetching } = useQuery<
    TimeSegment[]
  >({
    queryKey: [...TIME_TRACKING_KEY_ROOT, params],
    queryFn: () => getTimeSegments(params),
    staleTime: 0,
  });

  const { hasLoaded, isInitialError } = useHasLoadedQuery({
    data,
    isError,
    errorUpdatedAt,
    toastId: "time-tracking-refetch-error",
  });

  const segments = (data ?? [])
    .filter((segment) => segment.asistencia === attendance.id)
    .sort(byStart);

  return {
    segments,
    hasLoaded,
    isLoading,
    isInitialError,
    error: isInitialError ? error : null,
    refetch,
    isFetching,
  };
};
