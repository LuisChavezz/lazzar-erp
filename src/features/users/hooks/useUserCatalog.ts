import { useGuardedQuery } from "@/src/hooks/useGuardedQuery";
import { LIST_QUERY_GC_TIME } from "@/src/constants/queryCache";
import { getUserCatalog } from "../services/actions";

/**
 * Catálogo de usuarios activos de la empresa activa, para selectores
 * (`/usuarios/catalogo/`). Lo puede leer cualquier usuario autenticado, así que
 * sirve donde `useUsers` daría 403 (p. ej. a quien solo tiene Reportes).
 *
 * `companyId` va en la llave: el backend acota por la empresa activa de la
 * sesión, y el catálogo de una empresa no debe servir para otra. Apagado sin
 * empresa o con `enabled: false`.
 */
export const useUserCatalog = (
  companyId: number | null,
  { enabled = true }: { enabled?: boolean } = {},
) => {
  const { data, isLoading, isInitialError, error, refetch } = useGuardedQuery(
    {
      queryKey: ["user-catalog", companyId],
      queryFn: ({ signal }) => getUserCatalog(signal),
      enabled: enabled && companyId !== null,
      gcTime: LIST_QUERY_GC_TIME,
    },
    { toastId: "user-catalog-refetch-error" },
  );

  return {
    users: data ?? [],
    isLoading,
    isInitialError,
    error,
    refetch,
  };
};
