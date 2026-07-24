"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useWorkspaceStore } from "../store/workspace.store";
import { useMyCompanies } from "@/src/features/companies/hooks/useMyCompanies";
import { useCompanyBranches } from "../../branches/hooks/useCompanyBranches";
import { loginRedirects } from "@/src/constants/routePermissions";

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

export const useWorkspace = () => {
  const router = useRouter();
  const { data: session } = useSession();
  const { companies, loading: companiesLoading } = useMyCompanies(); // Obtener las empresas del usuario
  const setWorkspace = useWorkspaceStore((state) => state.setWorkspace);
  const setAvailableBranches = useWorkspaceStore((state) => state.setAvailableBranches);
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null); // ID de la empresa seleccionada
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

  // Fetch branches based on selected company (custom hook)
  const { branches: availableBranches, isLoading: branchesLoading } = useCompanyBranches(selectedCompanyId);

  // Sync available branches to store
  useEffect(() => {
    setAvailableBranches(availableBranches);
  }, [availableBranches, setAvailableBranches]);

  // Handle company selection
  const handleCompanySelect = (companyId: number) => {
    setSelectedCompanyId(companyId);
  };

  // Handle branch selection
  const handleBranchSelect = (branchId: number) => {
    setIsLoading(true);
    
    // Guardar selección en el store
    const selectedCompany = companies.find(c => c.id === selectedCompanyId);
    const selectedBranch = availableBranches.find(b => b.id === branchId);
    
    // Guardar en el store y redirigir si ambos están disponibles
    if (selectedCompany && selectedBranch) {  
      setWorkspace(selectedCompany, selectedBranch);
    }

    if (selectedCompany) {
      setWorkspaceCookie();
    }

    redirectAfterWorkspaceSelection();
  };

  // Handle back to company selection
  const handleBack = () => {
    setSelectedCompanyId(null);
  };

  // Handle continue without branch selection
  const handleContinueWithoutBranch = () => {
     const selectedCompany = companies.find(c => c.id === selectedCompanyId);

     if (!selectedCompany) {
       console.error("Selected company not found");
       return;
     }

     setIsLoading(true);

     // Guardar en el store y establecer cookie
     setWorkspace(selectedCompany);
     setWorkspaceCookie();

     redirectAfterWorkspaceSelection();
  };

  return {
    companies,
    companiesLoading,
    selectedCompanyId,
    isLoading,
    availableBranches,
    branchesLoading,
    handleCompanySelect,
    handleBranchSelect,
    handleBack,
    handleContinueWithoutBranch
  };
};
