import { MapPinIcon } from "@/src/components/Icons";
import { Loader } from "@/src/components/Loader";
import { Branch } from "@/src/features/branches/interfaces/branch.interface";
import NoBranchesState from "./NoBranchesState";

interface BranchGridProps {
  branches: Branch[];
  branchesLoading: boolean;
  isLoading: boolean;
  onSelect: (id: number) => void;
  onContinueWithoutBranch: () => void;
}

export default function BranchGrid({
  branches,
  branchesLoading,
  isLoading,
  onSelect,
  onContinueWithoutBranch,
}: BranchGridProps) {
  return (
    <div className="w-full">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {branchesLoading ? (
          <div className="col-span-full flex justify-center py-12">
            <Loader />
          </div>
        ) : (
          <>
            {branches.map((branch) => (
              <button
                key={branch.id}
                onClick={() => onSelect(branch.id)}
                disabled={isLoading}
                className="group cursor-pointer bg-white dark:bg-zinc-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 hover:border-sky-500 dark:hover:border-sky-500 hover:shadow-xl hover:shadow-sky-500/10 transition-all duration-300 text-left disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-3 rounded-xl bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400 group-hover:scale-110 transition-transform duration-300">
                    <MapPinIcon className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-sky-500 transition-colors">
                      {branch.nombre}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                      {branch.codigo}
                    </p>
                  </div>
                </div>
              </button>
            ))}

            {branches.length === 0 && (
              <NoBranchesState onContinue={onContinueWithoutBranch} />
            )}
          </>
        )}
      </div>
    </div>
  );
}
