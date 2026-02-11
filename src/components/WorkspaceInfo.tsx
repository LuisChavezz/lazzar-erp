"use client";

import { useWorkspaceStore } from "@/src/features/workspace/store/workspace.store";
import { BancosIcon, BuildingIcon } from "./Icons";

export const WorkspaceInfo = () => {
  const { selectedCompany, selectedBranch } = useWorkspaceStore();

  if (!selectedCompany?.id) {
    return null;
  }

  const companyName = selectedCompany.nombre_comercial || selectedCompany.razon_social;

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
          <BancosIcon className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
        </div>

        {/* Separator */}
        <div className="h-4 w-px bg-slate-300 dark:bg-slate-700"></div>

        {/* Branch */}
        <div className="flex items-center gap-1.5">
          {selectedBranch ? (
            <>
              <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                {selectedBranch.nombre}
              </span>
              <BuildingIcon className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
            </>
          ) : (
            <span className="text-xs text-slate-400 italic">
              Sin sucursal
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
