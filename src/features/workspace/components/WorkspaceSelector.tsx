"use client";

import { Loader } from "@/src/components/Loader";
import { ErrorDisplay } from "@/src/components/ui/ErrorDisplay";
import { useWorkspace } from "../hooks/useWorkspace";
import BranchGrid from "./BranchGrid";
import LockedCompanyCard from "./LockedCompanyCard";
import NoCompanyState from "./NoCompanyState";

export default function WorkspaceSelector() {
  const {
    sessionCompany,
    company,
    companyName,
    isLoading,
    availableBranches,
    branchesLoading,
    handleBranchSelect,
    handleContinueWithoutBranch,
  } = useWorkspace();

  // Mostrar loader mientras se confirma la empresa o se está seleccionando una sucursal
  if (sessionCompany.status === "loading" || isLoading) {
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
      <div className="text-center mb-12">
        <h2 className="text-4xl md:text-5xl text-slate-900 dark:text-white font-medium brand-font mb-4">
          {sessionCompany.status === "ready" ? "Selecciona una Sucursal" : "Bienvenido de nuevo"}
        </h2>
        {sessionCompany.status === "ready" && (
          <p className="text-slate-500 dark:text-slate-400 text-lg">
            Elige la ubicación donde trabajarás hoy
          </p>
        )}
      </div>

      <div className="w-full">
        {sessionCompany.status === "unknown" && (
          <ErrorDisplay
            title="No se pudo confirmar la empresa de tu usuario."
            onRetry={sessionCompany.retry}
          />
        )}

        {sessionCompany.status === "none" && (
          <NoCompanyState
            action={
              <button
                onClick={handleContinueWithoutBranch}
                className="px-6 py-2.5 cursor-pointer bg-sky-500 hover:bg-sky-600 text-white font-medium rounded-xl transition-colors shadow-lg shadow-sky-500/20"
              >
                Continuar
              </button>
            }
          />
        )}

        {sessionCompany.status === "ready" && (
          <>
            {/* La empresa no se elige (EC-842): es la de la sesión, bloqueada
                hasta que exista un endpoint para cambiarla (EC-843). */}
            <LockedCompanyCard name={companyName} rfc={company?.rfc} />
            <BranchGrid
              branches={availableBranches}
              branchesLoading={branchesLoading}
              isLoading={isLoading}
              onSelect={handleBranchSelect}
              onContinueWithoutBranch={handleContinueWithoutBranch}
            />
          </>
        )}
      </div>
    </div>
  );
}
