import { useQuery } from "@tanstack/react-query";
import { useHasLoadedQuery } from "@/src/hooks/useHasLoadedQuery";
import { getCustomerKpis } from "../services/actions";
import type { CustomerKpis } from "../interfaces/customer-kpis.interface";

/**
 * Llave propia, FUERA del prefijo `["customers"]`: los indicadores no se
 * derivan del listado, así que no se refrescan solos con él. Las mutaciones de
 * clientes que cambian lo que cuentan (alta: suma un cliente y lo asigna al
 * usuario; edición: cambia el nombre que muestran los drill-downs) la invalidan
 * explícitamente — `useCreateCustomer` y `useUpdateCustomer`.
 */
export const customerKpisQueryKey = ["customer-kpis"] as const;

/**
 * Indicadores de clientes (`GET /terceros/clientes/kpis/`).
 *
 * `refetchOnMount: "always"`: el backend los CALCULA en cada lectura a partir
 * de pedidos, facturas y cuentas por cobrar que cambian en otras pantallas; con
 * el `staleTime` global de 15 min, volver a la lista mostraría cifras viejas.
 * Mismo criterio que `usePedidoKpis`.
 *
 * Un refetch fallido con datos en caché los conserva y avisa por toast; solo un
 * fallo SIN datos (`isInitialError`) se pinta como error en la sección.
 */
export const useCustomerKpis = () => {
  const { data, isError, isFetching, errorUpdatedAt, refetch } = useQuery<CustomerKpis>({
    queryKey: customerKpisQueryKey,
    queryFn: () => getCustomerKpis(),
    refetchOnMount: "always",
  });

  const { isInitialError } = useHasLoadedQuery({
    data,
    isError,
    errorUpdatedAt,
    toastId: "customer-kpis-refetch-error",
    errorMessage: "No se pudieron actualizar los indicadores. Mostrando datos anteriores.",
  });

  return { data, isInitialError, isFetching, refetch };
};
