import { useRoles } from "@/src/features/roles/hooks/useRoles";
import { useUsers } from "@/src/features/users/hooks/useUsers";
import type { User } from "@/src/features/users/interfaces/user.interface";
import { isTransferCandidate } from "../utils/transferCandidates";

/**
 * Usuarios a quienes se puede transferir una oportunidad: los de Ventas según
 * `isTransferCandidate`. Necesita dos catálogos —usuarios (el mismo que el
 * filtro de vendedor del listado) y roles— y expone un solo estado:
 *
 * - `isLoading` mientras falte CUALQUIERA de los dos sin error inicial. Se
 *   mira la falta de datos y no `isLoading` de TanStack, que es `false` con la
 *   consulta pausada (sin red) y dejaría la lista vacía con el aviso de "no hay
 *   usuarios de Ventas".
 * - `isInitialError` si alguno NUNCA cargó (un refetch fallido con datos en
 *   caché no cuenta; misma regla que `useGuardedQuery`).
 * - `refetch` reintenta solo el catálogo que falló.
 *
 * `useUsers` y `useRoles` aún no pasan por `useGuardedQuery` (#239): aquí solo
 * se combinan, sin tocarlos.
 */
export const useTransferCandidates = () => {
  const usersQuery = useUsers();
  const rolesQuery = useRoles();
  const users = usersQuery.data;
  const roles = rolesQuery.data;

  const isInitialError = (usersQuery.isError && !users) || (rolesQuery.isError && !roles);
  const isLoading = !isInitialError && (!users || !roles);

  const rolesById = new Map((roles ?? []).map((role) => [role.id, role]));
  const candidates: User[] =
    users && roles ? users.filter((user) => isTransferCandidate(user, rolesById)) : [];

  const refetch = () => {
    if (usersQuery.isError) void usersQuery.refetch();
    if (rolesQuery.isError) void rolesQuery.refetch();
  };

  return {
    candidates,
    isLoading,
    isInitialError,
    isFetching: usersQuery.isFetching || rolesQuery.isFetching,
    refetch,
  };
};
