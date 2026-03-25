"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useWorkspaceStore } from "../store/workspace.store";
import { useMyCompanies } from "@/src/features/companies/hooks/useMyCompanies";
import { useCompanyBranches } from "../../branches/hooks/useCompanyBranches";


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

  const redirectPath =
    permissions.includes("R-CRM") && !isAdmin ? "/sales" : "/";

  const redirectAfterWorkspaceSelection = () => {
    setTimeout(() => {
      router.refresh();
      router.push(redirectPath);
    }, 800);
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
      document.cookie = "erp_workspace_id=true; path=/; max-age=604800; SameSite=Lax"; // Expira en 1 semana
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
     document.cookie = "erp_workspace_id=true; path=/; max-age=604800; SameSite=Lax"; // Expira en 1 semana
     
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
