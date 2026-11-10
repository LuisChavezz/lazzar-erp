"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useWorkspaceStore } from "../store/workspace.store";
import { useCompanyBranches } from "../../branches/hooks/useCompanyBranches";
import { loginRedirects } from "@/src/constants/routePermissions";
import { useSessionCompanyDetails } from "./useSessionCompanyDetails";

/**
 * Escribe la cookie de selección de workspace con atributos idénticos en todos
 * los flujos (con o sin sucursal) — un único punto de escritura evita que el
 * endurecimiento dependa de mantener dos cadenas sincronizadas a mano.
 *
 * Solo UX (no es control de acceso: el backend acota los datos por la
 * empresa/sucursal real del usuario) — `proxy.ts` únicamente comprueba su
 * existencia. `Secure` es seguro de añadir (todos los entornos desplegados son
 * HTTPS). No se marca `HttpOnly`: se escribe vía `document.cookie`, y esa API
 * del navegador no puede fijar cookies `HttpOnly` en absoluto (requeriría
 * emitirla como Set-Cookie desde el servidor), así que el atributo no aplica.
 */
const setWorkspaceCookie = () => {
  document.cookie = "erp_workspace_id=true; path=/; max-age=604800; SameSite=Lax; Secure"; // Expira en 1 semana
};

/**
 * Flujo de /select-branch. La empresa NO se elige (EC-842): es la de la sesión,
 * con la que el backend acota todo, y el paso de empresa queda bloqueado hasta
 * que exista un endpoint para cambiarla (EC-843). Solo se elige la sucursal.
 */
export const useWorkspace = () => {
  const router = useRouter();
  const { data: session } = useSession();
  const { sessionCompany, company, name: companyName } = useSessionCompanyDetails();
  const companyId = sessionCompany.companyId;
  const setBranch = useWorkspaceStore((state) => state.setBranch);
  const setAvailableBranches = useWorkspaceStore((state) => state.setAvailableBranches);
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
  const { branches: availableBranches, isLoading: branchesLoading } = useCompanyBranches(companyId);

  // Sync available branches to store
  useEffect(() => {
    setAvailableBranches(availableBranches);
  }, [availableBranches, setAvailableBranches]);

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
    company,
    companyName,
    isLoading,
    availableBranches,
    branchesLoading,
    handleBranchSelect,
    handleContinueWithoutBranch,
  };
};
