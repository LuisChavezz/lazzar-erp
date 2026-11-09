import { ModuleSectionsGrid } from "@/src/components/ModuleSectionsGrid";

// Página principal del Panel de Control — índice de sus reportes, filtrado por
// permisos con el mismo helper que el sidebar y `ModuleNav`.
export default function SystemPage() {
  return (
    <div className="w-full space-y-8">
      <ModuleSectionsGrid moduleKey="system" />
    </div>
  );
}
