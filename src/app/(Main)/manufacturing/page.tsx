import { ManufacturingDashboard } from "@/src/features/manufacturing/components/ManufacturingDashboard";

// Página principal del módulo de manufactura — Dashboard resumen operativo
export default function ManufacturingPage() {
  return (
    <div className="px-1 pb-8">
      {/* Encabezado de sección */}
      <div className="mb-6">
        <h1 className="text-xl font-black text-slate-800 dark:text-white tracking-tight">
          Manufactura
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Resumen operativo de los procesos de producción y bordado
        </p>
      </div>
      <ManufacturingDashboard />
    </div>
  );
}
