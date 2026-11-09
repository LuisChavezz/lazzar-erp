import { useSession } from "next-auth/react";
import { useSessionRecovery } from "@/src/features/auth/components/SessionRecoveryProvider";
import { canAccessRoute } from "@/src/utils/routeAccess";

/**
 * Para pintar enlaces condicionados a la regla del proxy (`canAccessRoute`)
 * fuera del sidebar (EC-813).
 *
 * - `isPending`: la sesión carga o se está recuperando; aún no hay permisos.
 *   Mismo criterio que el sidebar (`useSidebarSections`): el enlace se pinta
 *   como skeleton del mismo tamaño, no se oculta ni aparece de golpe después.
 * - `canOpen(path)`: ¿el proxy dejaría entrar al usuario? `false` mientras
 *   `isPending`.
 */
export const useRouteAccess = () => {
  const { data: session, status } = useSession();
  const { phase } = useSessionRecovery();
  const isPending = status === "loading" || phase === "recovering";
  return {
    isPending,
    canOpen: (pathname: string) => !isPending && canAccessRoute(pathname, session?.user),
    user: session?.user,
  };
};
