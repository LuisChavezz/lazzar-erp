import { useGuardedQuery } from "@/src/hooks/useGuardedQuery";
import { isNotFoundError } from "@/src/utils/drfWriteErrors";
import { isValidOpId } from "@/src/features/production-order-critical-path/hooks/useProductionOrderCriticalPath";
import { getProductionOrderStatus } from "../services/actions";

export const productionOrderStatusKey = (opId: number) =>
  ["production-order-status", opId] as const;

/**
 * Estatus de UNA OP y sus destinos posibles (`GET .../estatus/`). Lo pide la
 * página de detalle al cargar, con la misma caché que el detalle: los dos se
 * invalidan juntos tras un cambio, así que no se contradicen.
 *
 * El 404 es DEFINITIVO (`isDefinitiveError`): la OP no es visible para este
 * usuario en este endpoint, aunque sí lo sea su detalle (el backend acota
 * `estatus/` por sucursal y el detalle no). No se reintenta, no avisa y `data`
 * queda en `undefined`, así que la página simplemente no ofrece la acción.
 * Cualquier otro fallo inicial tampoco rompe la página: deja la acción oculta
 * (`isInitialError`). Un refetch fallido conserva lo cargado y avisa por toast.
 */
export const useProductionOrderStatus = (opId: number) => {
  const { data, isInitialError, isDefinitiveError } = useGuardedQuery(
    {
      queryKey: productionOrderStatusKey(opId),
      queryFn: () => getProductionOrderStatus(opId),
      enabled: isValidOpId(opId),
    },
    {
      toastId: "production-order-status-refetch-error",
      errorMessage: "No se pudieron actualizar las opciones de estatus.",
      isDefinitiveError: isNotFoundError,
    },
  );

  return { data, isInitialError, isDefinitiveError };
};
