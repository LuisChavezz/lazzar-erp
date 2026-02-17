"use client";

import { useWorkspaceStore } from "@/src/features/workspace/store/workspace.store";
import { BancosIcon, BuildingIcon, CheckCircleIcon, ChevronDownIcon } from "./Icons";
import { DropdownMenu } from "@radix-ui/themes";
import { Branch } from "../features/branches/interfaces/branch.interface";
import { LoadingSpinnerIcon } from "./Icons";

export const WorkspaceInfo = () => {
  const selectedCompany = useWorkspaceStore((state) => state.selectedCompany);
  const selectedBranch = useWorkspaceStore((state) => state.selectedBranch);
  const availableBranches = useWorkspaceStore((state) => state.availableBranches);
  const setWorkspace = useWorkspaceStore((state) => state.setWorkspace);
  const branchSwitching = useWorkspaceStore((state) => state.branchSwitching);

  if (!selectedCompany?.id) {
    return null;
  }

  const companyName = selectedCompany.nombre_comercial || selectedCompany.razon_social;

  const handleBranchSelect = (branch: Branch) => {
    if (branchSwitching) return;
    setWorkspace(selectedCompany, branch);
  };

  return (
    <div className="flex items-center gap-3">
      {/* Status Indicator */}
      <span className="relative flex h-2.5 w-2.5">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
      </span>

      <div className="flex items-center gap-3">
        {/* Company */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
            {companyName}
          </span>
          <BancosIcon className="w-4 h-4 text-sky-500 dark:text-sky-400" />
        </div>

        {/* Separator */}
        <div className="h-4 w-px bg-slate-300 dark:bg-slate-700"></div>

        {/* Branch */}
        <DropdownMenu.Root>
          <DropdownMenu.Trigger>
            <button
              type="button"
              aria-label={selectedBranch ? `Sucursal: ${selectedBranch.nombre}` : "Seleccionar sucursal"}
              disabled={branchSwitching}
              className={`flex items-center gap-1.5 transition-opacity ${
                branchSwitching ? "opacity-60 cursor-not-allowed" : "cursor-pointer hover:opacity-80"
              }`}
            >
              {selectedBranch ? (
                <>
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                    {selectedBranch.nombre}
                  </span>
                  {branchSwitching ? (
                    <LoadingSpinnerIcon className="w-4 h-4 text-slate-400 animate-spin" aria-hidden="true" />
                  ) : (
                    <>
                      <BuildingIcon className="w-4 h-4 text-sky-500 dark:text-sky-400" aria-hidden="true" />
                      <ChevronDownIcon className="w-3 h-3 text-slate-400" aria-hidden="true" />
                    </>
                  )}
                </>
              ) : (
                <>
                  <span className="text-xs text-slate-400 italic">
                    Sin sucursal
                  </span>
                  {branchSwitching ? (
                    <LoadingSpinnerIcon className="w-3 h-3 text-slate-400 animate-spin" aria-hidden="true" />
                  ) : (
                    <ChevronDownIcon className="w-3 h-3 text-slate-400" aria-hidden="true" />
                  )}
                </>
              )}
            </button>
          </DropdownMenu.Trigger>
          
          <DropdownMenu.Content align="end" className="bg-white! dark:bg-zinc-900! dark:text-white!">
            {availableBranches.length > 0 ? (
              availableBranches.map((branch) => (
                <DropdownMenu.Item 
                  key={branch.id}
                  disabled={branchSwitching}
                  onClick={() => handleBranchSelect(branch)}
                  className="flex items-center justify-between gap-3 min-w-30 cursor-pointer!"
                >
                  <span className={`text-xs ${selectedBranch?.id === branch.id ? "font-bold" : "font-medium"}`}>
                    {branch.nombre}
                  </span>
                  {selectedBranch?.id === branch.id && (
                    <CheckCircleIcon className="w-4 h-4 text-emerald-500" />
                  )}
                </DropdownMenu.Item>
              ))
            ) : (
              <DropdownMenu.Item disabled className="text-xs">
                No hay sucursales disponibles
              </DropdownMenu.Item>
            )}
          </DropdownMenu.Content>
        </DropdownMenu.Root>
      </div>
    </div>
  );
};
