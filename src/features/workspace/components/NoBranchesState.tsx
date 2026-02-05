import { MapPinIcon } from "@/src/components/Icons";

interface NoBranchesStateProps {
  onContinue: () => void;
}

export default function NoBranchesState({ onContinue }: NoBranchesStateProps) {
  return (
    <div className="col-span-full flex flex-col items-center justify-center py-12 px-4 rounded-3xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 border-dashed">
      <div className="p-4 rounded-full bg-slate-100 dark:bg-slate-800 mb-4">
        <MapPinIcon className="w-8 h-8 text-slate-400" />
      </div>
      <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">
        Sin sucursales disponibles
      </h3>
      <p className="text-slate-500 dark:text-slate-400 text-center max-w-sm mb-6">
        Esta empresa no tiene sucursales configuradas o no tienes acceso a ellas.
      </p>
      <button
        onClick={onContinue}
        className="px-6 py-2.5 cursor-pointer bg-sky-500 hover:bg-sky-600 text-white font-medium rounded-xl transition-colors shadow-lg shadow-sky-500/20"
      >
        Continuar con la empresa
      </button>
    </div>
  );
}
