"use client";

import { Loader } from "@/src/components/Loader";
import { useWorkspace } from "../hooks/useWorkspace";
import CompanyGrid from "./CompanyGrid";
import BranchGrid from "./BranchGrid";

export default function WorkspaceSelector() {
  const {
    companies,
    companiesLoading,
    selectedCompanyId,
    isLoading,
    availableBranches,
    branchesLoading,
    handleCompanySelect,
    handleBranchSelect,
    handleBack,
    handleContinueWithoutBranch,
  } = useWorkspace();

  // Mostrar loader mientras se cargan las empresas o se está seleccionando una sucursal
  if (companiesLoading || isLoading) {
    return (
      <div className="flex w-full items-center justify-center flex-col gap-4">
        <Loader />
        {isLoading && (
          <p className="text-slate-500 dark:text-slate-400 animate-pulse">
            Preparando tu espacio de trabajo...
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto px-4 flex flex-col items-center">
      {/* Header Dinámico */}
      <div
        className={`transition-all duration-500 ease-in-out text-center mb-12 ${
          selectedCompanyId ? "transform -translate-y-4" : ""
        }`}
      >
        <h2 className="text-4xl md:text-5xl text-slate-900 dark:text-white font-medium brand-font mb-4">
          {selectedCompanyId
            ? "Selecciona una Sucursal"
            : "Bienvenido de nuevo"}
        </h2>
        <p className="text-slate-500 dark:text-slate-400 text-lg">
          {selectedCompanyId
            ? "Elige la ubicación donde trabajarás hoy"
            : "Selecciona la empresa para comenzar"}
        </p>
      </div>

      <div className="w-full grid grid-cols-1 relative">
        <CompanyGrid
          companies={companies}
          selectedCompanyId={selectedCompanyId}
          loading={companiesLoading}
          onSelect={handleCompanySelect}
        />

        <BranchGrid
          branches={availableBranches}
          branchesLoading={branchesLoading}
          isLoading={isLoading}
          selectedCompanyId={selectedCompanyId}
          onSelect={handleBranchSelect}
          onBack={handleBack}
          onContinueWithoutBranch={handleContinueWithoutBranch}
        />
      </div>
    </div>
  );
}
