import { useGuardedQuery } from "@/src/hooks/useGuardedQuery";
import { getAccountingCustomers } from "../services/actions";

/**
 * Clientes de contabilidad, activos (por defecto) o dados de baja
 * (`activo: false`). La llave lleva `activo` (`["accounting-customers",
 * activo]`): cada vista es su propia entrada de caché, y las invalidaciones por
 * la raíz `["accounting-customers"]` alcanzan a las dos. Los selectores (p. ej.
 * el de cobros) llaman sin argumentos y siguen recibiendo solo activos.
 *
 * No expone el `isError` crudo: `isInitialError` solo es `true` si la vista
 * pedida nunca cargó; un refetch fallido con datos en caché conserva lo cargado
 * y avisa por toast (`useGuardedQuery`). `error` sigue la misma regla.
 *
 * `enabled: false` no dispara la consulta: lo usa quien lee este catálogo desde
 * OTRA sección sin el permiso de esta (lectura jerárquica, EC-734).
 */
export const useAccountingCustomers = ({
  activo = true,
  enabled = true,
}: { activo?: boolean; enabled?: boolean } = {}) => {
  const { data, hasLoaded, isLoading, isInitialError, error, refetch, isFetching } =
    useGuardedQuery(
      {
        queryKey: ["accounting-customers", activo],
        queryFn: () => getAccountingCustomers({ activo }),
        enabled,
      },
      { toastId: "accounting-customers-refetch-error" },
    );

  return {
    customers: data ?? [],
    hasLoaded,
    isLoading,
    isInitialError,
    error,
    refetch,
    isFetching,
  };
};
