import type { QueryClient } from "@tanstack/react-query";
import { isNotFoundError } from "@/src/utils/drfWriteErrors";
import { getConciliacion } from "../services/actions";
import type { ConciliacionBancaria } from "../interfaces/bank-reconciliation.interface";
import { CONCILIACIONES_KEY_ROOT } from "./useConciliaciones";

/**
 * Resultado de leer FRESCA una conciliación: la fila del servidor, `gone` si ya
 * no existe (`404`) o `error` si no se pudo consultar.
 */
export type FreshConciliacion =
  | { kind: "found"; conciliacion: ConciliacionBancaria }
  | { kind: "gone" }
  | { kind: "error" };

/**
 * Lee la conciliación del servidor (el listado puede tener hasta 15 minutos y
 * otra sesión pudo cerrarla o cancelarla) y escribe esa fila en TODAS las
 * entradas del listado (`setQueriesData` por la raíz, igual que la cancelación
 * optimista), para que la vista —y su aviso de confirmación desfasada— vean el
 * estatus real sin esperar un refetch completo. Un `404` invalida el listado:
 * la fila sale con el siguiente refetch.
 */
export const fetchFreshConciliacion = async (
  queryClient: QueryClient,
  id: number,
): Promise<FreshConciliacion> => {
  try {
    const conciliacion = await getConciliacion(id);
    queryClient.setQueriesData<ConciliacionBancaria[]>(
      { queryKey: CONCILIACIONES_KEY_ROOT },
      (old) => old?.map((row) => (row.id === id ? { ...row, ...conciliacion } : row)),
    );
    return { kind: "found", conciliacion };
  } catch (error) {
    if (isNotFoundError(error)) {
      void queryClient.invalidateQueries({ queryKey: CONCILIACIONES_KEY_ROOT });
      return { kind: "gone" };
    }
    return { kind: "error" };
  }
};
