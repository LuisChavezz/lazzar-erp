"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useWorkspaceStore } from "../store/workspace.store";
import { useCompanyBranches } from "../../branches/hooks/useCompanyBranches";
import { loginRedirects } from "@/src/constants/routePermissions";
import { useSessionCompanyDetails } from "./useSessionCompanyDetails";
import { setWorkspaceCookie } from "../utils/workspaceCookie";

/**
 * Flujo de /select-branch. La empresa NO se elige (EC-842): es la de la sesión,
 * con la que el backend acota todo, y el paso de empresa queda bloqueado hasta
 * que exista un endpoint para cambiarla (EC-843). Solo se elige la sucursal.
 */
export const useWorkspace = () => {
  const router = useRouter();
  const { data: session } = useSession();
  const { sessionCompany, name: companyName, rfc: companyRfc } = useSessionCompanyDetails();
  const companyId = sessionCompany.companyId;
  const setBranch = useWorkspaceStore((state) => state.setBranch);
  const [isLoading, setIsLoading] = useState(false); // Indicador de carga para la selección de sucursal
  const isAdmin = session?.user?.role === "admin";
  const permissions = session?.user?.permissions ?? [];

  // Determinar la ruta de redirección según los permisos del usuario (ordenado por prioridad)
  // Los administradores siempre van al dashboard principal
  const redirectPath = isAdmin
    ? "/"
    : loginRedirects.find((r) => permissions.includes(r.permission))?.path ?? "/";

  const redirectAfterWorkspaceSelection = () => {
    /*
     * El workspace ya quedó escrito de forma SÍNCRONA antes de llegar aquí
     * (store de Zustand + cookie vía `document.cookie`), así que se navega de
     * inmediato. Se eliminó:
     *   - un `setTimeout(…, 800)` artificial que añadía ~0.8s de stall percibido
     *     en cada login sin compensar ninguna dependencia asíncrona real, y
     *   - un `router.refresh()` redundante que re-renderizaba /select-branch
     *     (la ruta que se abandona): la propia `router.push` ya atraviesa el
     *     middleware con la cookie nueva y el destino no depende de la cookie de
     *     workspace en el servidor (los datos por sucursal los refresca TanStack
     *     Query en cliente), por lo que nadie consume ese refresh.
     */
    router.push(redirectPath);
  };

  // Sucursales del usuario en la empresa de la sesión
  // Un fallo de `mis-sucursales` NO es "sin sucursales": se expone aparte para
  // mostrar el error con reintento en vez de ofrecer entrar sin sucursal.
  const {
    branches: availableBranches,
    isLoading: branchesLoading,
    isInitialError: isErrorBranches,
    refetch: refetchBranches,
  } = useCompanyBranches(companyId);

  // Handle branch selection
  const handleBranchSelect = (branchId: number) => {
    const selectedBranch = availableBranches.find(b => b.id === branchId);
    if (!companyId || !selectedBranch) return;

    setIsLoading(true);
    setBranch(selectedBranch);
    setWorkspaceCookie();
    redirectAfterWorkspaceSelection();
  };

  /**
   * Entrar sin sucursal: cuando la empresa no tiene sucursales para el usuario,
   * o cuando el usuario no tiene empresa asignada (cada módulo afectado muestra
   * entonces su aviso de "sin empresa asignada").
   */
  const handleContinueWithoutBranch = () => {
    if (sessionCompany.status !== "ready" && sessionCompany.status !== "none") return;

    setIsLoading(true);
    setBranch(null);
    setWorkspaceCookie();
    redirectAfterWorkspaceSelection();
  };

  return {
    sessionCompany,
    companyName,
    companyRfc,
    isLoading,
    availableBranches,
    branchesLoading,
    isErrorBranches,
    retryBranches: () => void refetchBranches(),
    handleBranchSelect,
    handleContinueWithoutBranch,
  };
};
