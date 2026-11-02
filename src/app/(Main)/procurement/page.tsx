import { ModuleSectionsGrid } from "@/src/components/ModuleSectionsGrid";

// Página principal de Compras y SCM — índice de sus sub-grupos.
export default function ProcurementPage() {
  return (
    <div className="w-full space-y-8">
      <ModuleSectionsGrid moduleKey="procurement" />
    </div>
  );
}
