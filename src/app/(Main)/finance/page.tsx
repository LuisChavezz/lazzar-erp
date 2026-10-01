import { ModuleSectionsGrid } from "@/src/components/ModuleSectionsGrid";

// Página principal de Finanzas y Contabilidad — índice de sus sub-grupos.
export default function FinancePage() {
  return (
    <div className="w-full space-y-8">
      <ModuleSectionsGrid moduleKey="finance" />
    </div>
  );
}
