import { useSession } from "next-auth/react";
import type { AppRouteGroup } from "@/src/constants/appRoutes";
import { useSessionRecovery } from "@/src/features/auth/components/SessionRecoveryProvider";
import { getSidebarSectionsForSession } from "@/src/utils/getSidebarItems";
import { getRouteSectionsForSession } from "@/src/utils/routeSections";

/**
 * Estado de la sesión tal como lo necesita el sidebar (EC-767). Única fuente
 * para `Sidebar`, `MobileSidebar` y `SidebarModuleItems`:
 *
 * - `isPending`: la sesión carga o se está recuperando → skeleton en los
 *   accesos que dependen de un permiso.
 * - `isUnavailable`: la recuperación se agotó → aviso con "Reintentar"; el menú
 *   queda con los accesos que no dependen de permisos.
 */
const useSidebarSession = () => {
  const { data: session, status } = useSession();
  const { phase, retry } = useSessionRecovery();
  return {
    user: session?.user,
    isPending: status === "loading" || phase === "recovering",
    isUnavailable: phase === "exhausted",
    retry,
  };
};

/** Secciones del sidebar para `pathname` según el estado de la sesión. */
export const useSidebarSections = (pathname: string) => {
  const { user, isPending, isUnavailable, retry } = useSidebarSession();
  return {
    sections: getSidebarSectionsForSession(pathname, user, isPending),
    isPending,
    isUnavailable,
    retry,
  };
};

/** Sub-grupos del módulo `group` según el estado de la sesión. */
export const useSidebarModuleSections = (group: AppRouteGroup) => {
  const { user, isPending } = useSidebarSession();
  return getRouteSectionsForSession(group, user, isPending);
};
