import { ModuleSectionsGrid } from "@/src/components/ModuleSectionsGrid";

// Página principal de Mesa de Control — índice de sus sub-grupos.
export default function OperationsPage() {
  return (
    <div className="w-full space-y-8">
      <ModuleSectionsGrid moduleKey="operations" />
    </div>
  );
}
