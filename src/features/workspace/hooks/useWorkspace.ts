"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useWorkspaceStore } from "../store/workspace.store";
import { useMyCompanies } from "@/src/features/companies/hooks/useMyCompanies";
import { useCompanyBranches } from "../../branches/hooks/useCompanyBranches";


export const useWorkspace = () => {
  const router = useRouter();
  const { companies, loading: companiesLoading } = useMyCompanies(); // Obtener las empresas del usuario
  const { setWorkspace } = useWorkspaceStore(); // Guardar el workspace en el store
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null); // ID de la empresa seleccionada
  const [isLoading, setIsLoading] = useState(false); // Indicador de carga para la selección de sucursal

  // Fetch branches based on selected company (custom hook)
  const { branches: availableBranches, isLoading: branchesLoading } = useCompanyBranches(selectedCompanyId);

  // Handle company selection
  const handleCompanySelect = (companyId: number) => {
    setSelectedCompanyId(companyId);
  };

  // Handle branch selection
  const handleBranchSelect = (branchId: number) => {
    setIsLoading(true);
    
    // Guardar selección en el store
    const selectedCompany = companies.find(c => c.id_empresa === selectedCompanyId);
    const selectedBranch = availableBranches.find(b => b.id === branchId);
    
    // Guardar en el store y redirigir si ambos están disponibles
    if (selectedCompany && selectedBranch) {  
      setWorkspace(selectedCompany, selectedBranch);
      document.cookie = "erp_workspace_id=true; path=/; max-age=86400; SameSite=Lax";
    }

    // Redirigir a dashboard después de 1 segundo para consistencia visual
    setTimeout(() => {
      router.push("/dashboard");
    }, 800);
  };

  // Handle back to company selection
  const handleBack = () => {
    setSelectedCompanyId(null);
  };

  // Handle continue without branch selection
  const handleContinueWithoutBranch = () => {
     setIsLoading(true);
     
     const selectedCompany = companies.find(c => c.id_empresa === selectedCompanyId);

     // Guardar en el store y redirigir si la empresa está disponible
     if (selectedCompany) {
       setWorkspace(selectedCompany);
       document.cookie = "erp_workspace_id=true; path=/; max-age=86400; SameSite=Lax";
     }
     
     // Redirigir a dashboard después de 1 segundo para consistencia visual
     setTimeout(() => {
       router.push("/dashboard");
     }, 800);
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
