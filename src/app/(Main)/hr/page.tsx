import { HrModuleGrid } from "@/src/features/hr/components/HrModuleGrid";

// Página principal del módulo de Capital Humano — índice de sus catálogos.
export default function HrPage() {
  return (
    <div className="w-full space-y-8">
      <div>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Plantilla, asistencia, nómina y desempeño del talento de la organización.
        </p>
      </div>

      <HrModuleGrid />
    </div>
  );
}
