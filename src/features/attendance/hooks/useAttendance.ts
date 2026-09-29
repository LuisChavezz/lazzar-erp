import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useHasLoadedQuery } from "@/src/hooks/useHasLoadedQuery";
import { getAttendance } from "../services/actions";
import type { Attendance, AttendanceListParams } from "../interfaces/attendance.interface";

/**
 * Raíz de la llave del recurso. Invalidar por este PREFIJO alcanza a todas las
 * vistas sin importar sus parámetros (el día del pase de lista y el periodo del
 * historial). Toda escritura del módulo invalida por aquí.
 */
export const ATTENDANCE_KEY_ROOT = ["attendance"] as const;

/**
 * Registros de asistencia filtrados EN EL SERVIDOR (`fecha`, o `fecha__gte` +
 * `fecha__lte`). El endpoint no pagina y hay un registro por empleado y día,
 * así que la pantalla nunca pide el listado sin acotar. Mismo patrón que
 * `useConciliaciones`: `params` forma parte de la llave, y `enabled` deja no
 * consultar mientras el filtro no sea válido.
 *
 * `isInitialError` solo es `true` si la consulta de ESTOS parámetros nunca
 * cargó; un refetch fallido conserva lo cargado y avisa por toast
 * (`useHasLoadedQuery`).
 */
export const useAttendance = (
  params: AttendanceListParams,
  options: { enabled?: boolean; toastId: string }
) => {
  const enabled = options.enabled ?? true;

  const {
    data: queryData,
    isLoading,
    isError,
    error,
    errorUpdatedAt,
    refetch,
    isFetching,
    isPlaceholderData,
  } = useQuery<Attendance[]>({
    queryKey: [...ATTENDANCE_KEY_ROOT, params],
    queryFn: () => getAttendance(params),
    enabled,
    // Al cambiar de un filtro válido a otro se conservan los datos previos en
    // vez de parpadear a vacío. SOLO con la consulta habilitada: TanStack Query
    // v5 aplica `placeholderData` también a una consulta deshabilitada (ver
    // `useConciliaciones`).
    placeholderData: enabled ? keepPreviousData : undefined,
  });

  // Sin consulta vigente no hay filas: lo que conserve la caché no describe el
  // filtro seleccionado.
  const data = enabled ? queryData : undefined;

  const { hasLoaded, isInitialError } = useHasLoadedQuery({
    data,
    isError,
    errorUpdatedAt,
    toastId: options.toastId,
  });

  return {
    records: data ?? [],
    hasLoaded,
    isLoading,
    isInitialError,
    error: isInitialError ? error : null,
    refetch,
    isFetching,
    isPlaceholderData,
  };
};
